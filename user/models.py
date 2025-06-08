from django.db import models
from django.contrib.auth.models import AbstractBaseUser, UserManager, AbstractUser, PermissionsMixin

# Create your models here.
class User(AbstractUser):
    status = models.CharField(max_length=100, default='offline')

    def __str__(self):
        return f"{self.username}, {self.first_name}, {self.last_name}, {self.password}"
    
class Invitation(models.Model):
    PENDING = 'pending'
    ACCEPTED = 'accepted'
    REJECTED = 'rejected'
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (ACCEPTED, 'Accepted'),
        (REJECTED, 'Rejected'),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_invitations')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    date_sent = models.DateTimeField(auto_now_add=True)
    date_accepted = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"
    
class Friendship(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships_as_user2')
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user1.username} <-> {self.user2.username}"   
    