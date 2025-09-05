from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Message, MastodonAccount, MastodonPost

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'content', 'created_at', 'user']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class MastodonAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = MastodonAccount
        fields = [
            'mastodon_user_id', 'mastodon_username', 'mastodon_display_name', 
            'instance_url', 'profile_image_url', 'follower_count', 'following_count',
            'is_verified', 'connected_at', 'last_sync'
        ]

class MastodonPostSerializer(serializers.ModelSerializer):
    mastodon_username = serializers.CharField(source='mastodon_account.mastodon_username', read_only=True)
    
    class Meta:
        model = MastodonPost
        fields = [
            'id', 'toot_id', 'content', 'posted_at', 
            'favourites_count', 'reblogs_count', 'replies_count',
            'mastodon_username', 'created_at'
        ]