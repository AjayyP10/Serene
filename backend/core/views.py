from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Message
from .serializers import MessageSerializer, UserSerializer, RegisterSerializer
from .mastodon_service import MastodonService
import json
from datetime import datetime
from django.utils import timezone

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email
        })

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def message_list_create(request):
    if request.method == 'GET':
        messages = Message.objects.filter(user=request.user).order_by('-created_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_mastodon_post(request):
    """Create a new post and publish it to Mastodon"""
    try:
        content = request.data.get('content', '').strip()
        visibility = request.data.get('visibility', 'public')
        
        if not content:
            return Response(
                {'error': 'Content is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize Mastodon service
        mastodon_service = MastodonService()
        
        # Post to Mastodon
        mastodon_result = mastodon_service.post_status(content, visibility)
        
        if not mastodon_result['success']:
            return Response(
                {'error': f"Failed to post to Mastodon: {mastodon_result['error']}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # For now, just save as a regular message since Mastodon posting worked
        message = Message.objects.create(
            user=request.user,
            content=f"[MASTODON] {content}",
            activity_type='mastodon_post'
        )
        
        return Response({
            'success': True,
            'message': 'Post created and published to Mastodon successfully',
            'post': {
                'id': message.id,
                'content': content,
                'created_at': message.created_at,
                'mastodon_id': mastodon_result['post_id']
            },
            'mastodon_url': mastodon_result['url']
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"Error in create_mastodon_post: {str(e)}")
        print(traceback.format_exc())
        
        return Response(
            {'error': f'An error occurred: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_mastodon_posts(request):
    """Get all Mastodon posts for the current user"""
    try:
        # Get messages that are Mastodon posts
        posts = Message.objects.filter(
            user=request.user, 
            activity_type='mastodon_post'
        ).order_by('-created_at')
        
        post_data = []
        for post in posts:
            # Remove the [MASTODON] prefix for display
            content = post.content.replace('[MASTODON] ', '')
            post_data.append({
                'id': post.id,
                'content': content,
                'created_at': post.created_at
            })
        
        return Response({
            'success': True,
            'posts': post_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'An error occurred: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_mastodon_account_info(request):
    """Get Mastodon account information"""
    try:
        mastodon_service = MastodonService()
        account_info = mastodon_service.get_account_info()
        
        return Response(account_info, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'An error occurred: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )