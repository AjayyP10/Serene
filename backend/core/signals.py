from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from .models import LoginLog
from django.http import HttpRequest

@receiver(user_logged_in)
def log_user_login(sender, request: HttpRequest, user, **kwargs):
    LoginLog.objects.create(
        user=user,
        ip_address=request.META.get('REMOTE_ADDR')
    )