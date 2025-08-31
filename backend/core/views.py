from rest_framework import generics
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import Message, LoginLog
from .serializers import MessageSerializer, RegisterSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth.models import User
import logging
from django.utils import timezone
from django.http import HttpRequest

logger = logging.getLogger(__name__)

class CustomObtainAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            token, created = Token.objects.get_or_create(user=user)  # Ensure Token model is correct
            logger.info(f"Login successful for user {user.username}, logging to database")
            LoginLog.objects.create(user=user, ip_address=request.META.get('REMOTE_ADDR'))
            return Response({'token': token.key}, status=200)
        return Response({'error': 'Invalid credentials'}, status=400)

class MessageListCreate(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        logger.info(f"Auth check for user: {self.request.user}, token: {self.request.auth}")
        return Message.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        logger.info(f"User {self.request.user.username} created message: {serializer.data['content']}")

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            logger.info(f"New user registered: {request.data['username']}")
            # Log the registration as a login event (simplified)
            LoginLog.objects.create(user=User.objects.get(username=request.data['username']), ip_address=request.META.get('REMOTE_ADDR'))
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        logger.warning(f"Registration failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Note: For actual login logging, integrate with your authentication view or middleware
# Example pseudo-code for a login view or middleware:
"""
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login

def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user:
        login(request, user)
        LoginLog.objects.create(user=user, ip_address=request.META.get('REMOTE_ADDR'))
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key}, status=status.HTTP_200_OK)
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
"""