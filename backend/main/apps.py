from django.apps import AppConfig
import sys


class MainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main'
    
    default_permissions = [
        'main.customer',
    ]
    
    def ready(self):
        from . import signals
        from .signals import register_permissions
        if 'makemigrations' in sys.argv or 'migrate' in sys.argv:
            return
        
        register_permissions(self.default_permissions, self.name)
