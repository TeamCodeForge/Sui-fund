from django.db import models
from main.models import User

# Create your models here.
class AjoUser(models.Model):
    user = models.OneToOneField(
        User, 
        related_name = 'ajo',
        on_delete = models.CASCADE
    )
    wallet_address = models.TextField()
    

    
class SavingsGroup(models.Model):
    name = models.CharField(max_length=250)
    cycle_duration_days = models.PositiveIntegerField()
    start_cycle = models.PositiveIntegerField()
    contribution_amount = models.DecimalField(max_digits=9, decimal_places=4)
    participants = models.ManyToManyField(User, related_name='savings_groups')
    active = models.BooleanField(default = False)
    address_link = models.TextField(default = '0x000000')
    


class MyNotification(models.Model):
    message = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=150, choices=[('group_invitation','group_invitation'),('group_joined','group_joined')]),
    is_read = models.BooleanField(default=False)
    contrib_address = models.TextField(blank = True, null = True)