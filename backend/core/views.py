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
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import tempfile
import os
import uuid

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
    """Create a new post and publish it to Mastodon with optional media attachments"""
    try:
        content = request.data.get('content', '').strip()
        visibility = request.data.get('visibility', 'public')
        
        # Handle media files
        media_files = request.FILES.getlist('media_files')
        alt_texts = request.data.getlist('alt_texts') if 'alt_texts' in request.data else []
        
        # Content is optional if media files are provided
        if not content and not media_files:
            return Response(
                {'error': 'Either content or media files are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate media files count
        if len(media_files) > 4:
            return Response(
                {'error': 'Maximum 4 media files allowed per post'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process uploaded files
        temp_file_paths = []
        processed_alt_texts = []
        
        try:
            for i, uploaded_file in enumerate(media_files):
                # Create temporary file
                temp_dir = tempfile.gettempdir()
                file_extension = os.path.splitext(uploaded_file.name)[1]
                temp_filename = f"mastodon_upload_{uuid.uuid4()}{file_extension}"
                temp_file_path = os.path.join(temp_dir, temp_filename)
                
                # Save uploaded file to temporary location
                with open(temp_file_path, 'wb+') as temp_file:
                    for chunk in uploaded_file.chunks():
                        temp_file.write(chunk)
                
                temp_file_paths.append(temp_file_path)
                
                # Get corresponding alt text
                alt_text = alt_texts[i] if i < len(alt_texts) else None
                processed_alt_texts.append(alt_text)
            
            # Initialize Mastodon service
            mastodon_service = MastodonService()
            
            # Post to Mastodon with media
            mastodon_result = mastodon_service.post_status(
                content=content,
                visibility=visibility,
                media_files=temp_file_paths if temp_file_paths else None,
                alt_texts=processed_alt_texts if processed_alt_texts else None
            )
            
            if not mastodon_result['success']:
                return Response(
                    {'error': f"Failed to post to Mastodon: {mastodon_result['error']}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Save to local database
            media_info = f" [{mastodon_result.get('media_count', 0)} media files]" if temp_file_paths else ""
            message = Message.objects.create(
                user=request.user,
                content=f"[MASTODON]{media_info} {content}",
                activity_type='mastodon_post'
            )
            
            return Response({
                'success': True,
                'message': 'Post created and published to Mastodon successfully',
                'post': {
                    'id': message.id,
                    'content': content,
                    'created_at': message.created_at,
                    'mastodon_id': mastodon_result['post_id'],
                    'media_count': mastodon_result.get('media_count', 0)
                },
                'mastodon_url': mastodon_result['url']
            }, status=status.HTTP_201_CREATED)
            
        finally:
            # Clean up temporary files
            for temp_file_path in temp_file_paths:
                try:
                    if os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
                except Exception as cleanup_error:
                    print(f"Warning: Could not delete temp file {temp_file_path}: {cleanup_error}")
        
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
            # Extract content and media info
            content = post.content
            media_count = 0
            
            # Parse media info from content
            if '[MASTODON]' in content:
                content = content.replace('[MASTODON]', '').strip()
                if content.startswith('[') and 'media files]' in content:
                    # Extract media count
                    try:
                        media_part = content.split(']')[0] + ']'
                        media_count = int(media_part.split('[')[1].split(' ')[0])
                        content = content.split('] ', 1)[1] if '] ' in content else content
                    except:
                        pass
            
            post_data.append({
                'id': post.id,
                'content': content,
                'created_at': post.created_at,
                'media_count': media_count
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