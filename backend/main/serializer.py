
from rest_framework import serializers
from main import models
import logging
from decimal import Decimal, InvalidOperation
from main.tasks import celery_send_email
from django.template.loader import render_to_string
from django.conf import settings
from main.models import Permission
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer



logger = logging.getLogger(__name__)

# SIMPLE JWT

class ClientTokenObtainPairSerializer(TokenObtainPairSerializer):
    def get_token(self, user):
        token = super().get_token(user)
        token['user_type'] = 'client'
        return token

class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def get_token(self, user):
        token = super().get_token(user)
        token['user_type'] = 'admin'
        return token

# OTHERS

class AdminUserSerializer(serializers.ModelSerializer):
    # Add permissions field to accept a list of permission names
    permissions = serializers.ListField(
        child=serializers.CharField(max_length=None),
        required=False,
        default=[]
    )


    class Meta:
        model = models.User
        fields = ['id', 'first_name', 'last_name', 'image','account', 'username', 'date_joined', 'email', 'confirmed', 'permissions', 'account']
        read_only_fields = ['id','date_joined']

    def validate_permissions(self, value):
        """
        Validate that all provided permissions exist in the system
        """
        if not value:  # If permissions list is empty, that's fine
            return value

        # Get all registered permission names
        registered_permissions = set(Permission.objects.values_list('name', flat=True))
        
        # Check each permission
        invalid_permissions = [perm for perm in value if perm not in registered_permissions]
        if invalid_permissions:
            raise serializers.ValidationError(
                f"The following permissions are not valid: {', '.join(invalid_permissions)}"
            )
        
        return value

    def create(self, validated_data):
        """
        Create a new user and add specified permissions
        """
        # Extract permissions from validated data if they exist
        permissions = validated_data.pop('permissions', [])
        
        logger.debug(permissions)
        # Create the user instance
        user = super().create(validated_data)
        
        
        # Add valid permissions to the user
        for permission in permissions:
            user.add_permission(permission)
            
        return user

    def update(self, instance, validated_data):
        """
        Update user instance, including permissions if provided
        """
        permissions = validated_data.pop('permissions', None)
        
        logger.debug(permissions)
        
        # Update the user instance with remaining fields
        instance = super().update(instance, validated_data)
        
        # If permissions were provided, update them
        if permissions is not None:
            # Clear existing permissions and add new ones
            instance.permissions.clear()
            for permission in permissions:
                instance.add_permission(permission)
        
 
                
        return instance
        
class PasswordSerializer(serializers.Serializer):
    password = serializers.CharField(min_length = 8)
    token = serializers.CharField(max_length = None)


class UserSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField('get_image_url')
    
    admin = serializers.SerializerMethodField('get_admin')

    class Meta:
        model = models.User
        fields = ['username','image_url','id','email', 'admin', 'first_name', 'last_name',  'confirmed', 'permissions']
        depth = 1


    def get_admin(self, obj):
        return obj.is_superuser
    
    def get_image_url(self, obj):
        try:
            return obj.image.url
        except ValueError:
            return ''

class RegistrationSerializer(serializers.Serializer):
    password = serializers.CharField(max_length = 50)
    username = serializers.CharField(max_length = 50)
    first_name = serializers.CharField(max_length = 50)
    last_name = serializers.CharField(max_length = 50)
    email = serializers.CharField(max_length = 50)


    def create(self, validated_data):
        email = validated_data['email']

        #checking if email is already registered
        r_user = models.User.objects.filter(email = email).first()
        if r_user:
            logger.debug('User email is already in use.')
            return False

        user = models.User.objects.create_user(email = email,
            username = validated_data['username'],
            first_name = validated_data['first_name'],
            last_name = validated_data['last_name'],
            password = validated_data['password'])


        logger.info('Registered a new user')
        self.send_mail(user.email, f'{validated_data["link"]}?token={user.generate_confirmation_token()}')

        return True

    def send_mail(self, email, link):
        logger.info(f'Sending forgot password email to user {email}')
        message = render_to_string('mail/confirmation.html', {'email': email, 'link': link})
        try:
            celery_send_email.delay(
            subject='Email Confirmation',
             message=link, 
             from_email=settings.EMAIL_DEFAULT_SENDER, 
             recipient_list=[email,],
             fail_silently = False, 
             html_message = message)
        except:
            logger.exception('Sending exception ...')
    
