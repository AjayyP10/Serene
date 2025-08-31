from django.urls import path
from .views import MessageListCreate, RegisterView

urlpatterns = [
    path('', MessageListCreate.as_view(), name='message-list-create'),
    path('register/', RegisterView.as_view(), name='register'),
]