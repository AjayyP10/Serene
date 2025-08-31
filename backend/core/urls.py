from django.urls import path
from . import views

urlpatterns = [
    path('messages/', views.MessageListCreate.as_view(), name='message-list'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.CustomObtainAuthToken.as_view(), name='login'),  # New login endpoint
    # Optional: path('login-logs/', views.LoginLogList.as_view(), name='login-logs'),
]