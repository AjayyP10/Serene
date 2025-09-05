from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', views.CustomAuthToken.as_view(), name='api_token_auth'),
    path('auth/register/', views.register, name='register'),
    
    # Message endpoints
    path('messages/', views.message_list_create, name='message_list_create'),
    
    # Mastodon endpoints
    path('mastodon/post/', views.create_mastodon_post, name='create_mastodon_post'),
    path('mastodon/posts/', views.get_mastodon_posts, name='get_mastodon_posts'),
    path('mastodon/account/', views.get_mastodon_account_info, name='get_mastodon_account_info'),
]