from django.db import models
from django.contrib.auth.models import User

class LoginLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    login_time = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} logged in at {self.login_time}"

class Message(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    activity_type = models.CharField(max_length=50, default='message_created')
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.content[:50]}..."

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=100)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"

class MastodonAccount(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    mastodon_user_id = models.CharField(max_length=100, unique=True)
    mastodon_username = models.CharField(max_length=100)
    mastodon_display_name = models.CharField(max_length=200, blank=True)
    instance_url = models.URLField()  # e.g., https://mastodon.social
    access_token = models.TextField()
    profile_image_url = models.URLField(blank=True)
    follower_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    connected_at = models.DateTimeField(auto_now_add=True)
    last_sync = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"@{self.mastodon_username}@{self.instance_url}"

class MastodonPost(models.Model):
    mastodon_account = models.ForeignKey(MastodonAccount, on_delete=models.CASCADE)
    toot_id = models.CharField(max_length=100)  # Mastodon post ID
    content = models.TextField()
    posted_at = models.DateTimeField()
    favourites_count = models.IntegerField(default=0)
    reblogs_count = models.IntegerField(default=0)
    replies_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"@{self.mastodon_account.mastodon_username}: {self.content[:50]}..."