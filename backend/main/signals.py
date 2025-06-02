import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from main import models
from django.utils.timezone import now
from uuid import uuid4
from django.conf import settings

logger = logging.getLogger(__name__)
   
def generate_unique_id():
    _id =  uuid4().hex +  str(now().timestamp()).replace('.','')
    return _id

def register_permissions(permissions, app_label):
    for perm in permissions:
        models.Permission.objects.get_or_create(name=perm, app_label=app_label)
        

@receiver(pre_save, sender = models.User)
def user_id_generator(sender, instance, **kwargs):
    if not instance.app_user_id:
        instance.app_user_id = generate_unique_id()