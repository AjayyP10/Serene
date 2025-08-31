from django.db import models

# Create your models here.

from django.db import models
from django.contrib.auth.models import User

class Message(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.content[:50]}..."