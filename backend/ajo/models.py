from django.db import models
from main.models import User

# Create your models here.
class AjoUser(models.Model):
    user = models.ForeignKey(
        User,
        related_name = 'ajo',
        on_delete = models.CASCADE
    )
    wallet_address = models.TextField()
    

    

    