#user_models.py
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from itsdangerous.exc import BadSignature
from django.conf import settings
from logging import getLogger
from main.storages import get_storage
from django.contrib.postgres.fields import ArrayField 
logger = getLogger(__name__)
from faker import Faker

faker = Faker()


DEFAULT_APP_PERMISSIONS = set()


class ActiveManager(models.Manager):
    def active(self):
        return self.filter(active=True)

class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, username, email, password, **extra_fields):
        if not email:
            raise ValueError('The email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email, password=None, **extra_fields):
        if(email in settings.ADMIN_EMAIL.split(',')):
            return self.create_superuser(username, email, password, confirmed=True, **extra_fields)
        else:
            extra_fields.setdefault("is_staff", False)
            extra_fields.setdefault("is_superuser", False)
            return self._create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
      
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Super user must have is_staff=True.")

        return self._create_user(username, email, password, **extra_fields)

    def get_by_role(self, role):
        """Get users by role"""
        return self.filter(role=role)

class User(AbstractUser):
    

    # Existing fields
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    username = models.CharField(max_length=100)
    email = models.EmailField("email address", unique=True)
    image = models.ImageField(blank=True, upload_to='user-images', storage=get_storage('user'))
    confirmed = models.BooleanField(default=False)
    app_user_id = models.CharField(unique=True, max_length=225)
    account = models.CharField(max_length=100, default = 'customer', choices=[('customer','customer'),('staff','staff')])
    
    # PostgreSQL optimized:
    permissions = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    objects = UserManager()

    def __str__(self):
        return f"{self.get_full_name()} "

    # Role check methods
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    def is_distributor(self):
        return self.role == self.Role.DISTRIBUTOR

    def is_blogger(self):
        return self.role == self.Role.BLOGGER

    def is_customer(self):
        return self.role == self.Role.CUSTOMER
    
    
    
    
    def has_permission(self, perm_name):
        """Check if permission exists in user's permission list"""
        return perm_name in self.permissions

    def add_permission(self, perm_name):
        perm_exists = Permission.objects.filter(name = perm_name).exists()
        if not perm_exists:
            return False
    
        """Add a permission if not already present"""
        if perm_name not in self.permissions:
            self.permissions.append(perm_name)
            self.save()
        
        return True

    def remove_permission(self, perm_name):
        """Remove a permission if exists"""
        if perm_name in self.permissions:
            self.permissions.remove(perm_name)
            self.save()

    # Keep your existing token methods
    def generate_confirmation_token(self, expiration=3600):
        s = Serializer(settings.SECRET_KEY, expiration)
        return s.dumps({'confirmation': self.app_user_id}).decode('utf8')

    def confirm_token(self, token):
        s = Serializer(settings.SECRET_KEY)
        try:
            data = s.loads(token.encode('utf8'))
        except:
            return False

        if data.get('confirmation') != self.app_user_id:
            return False

        return True
    
    def create_dummy_users(count=10):
        """
        Create dummy users using the Faker library.

        Args:
            count (int): Number of dummy users to create.
        """
        fake = Faker()
        users = []

        for _ in range(count):
            users.append(
                User(
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    username=fake.user_name(),
                    email=fake.unique.email(),
                    image=None,  # You can add logic to generate or upload images if needed
                    confirmed=fake.boolean(),
                    app_user_id=fake.uuid4(),
                )
            )

        # Bulk create users in the database
        User.objects.bulk_create(users)
        print(f"{count} dummy users created successfully.")

    @classmethod
    def load_user(cls, token):
        s = Serializer(settings.SECRET_KEY)
        try: 
            data = s.loads(token.encode('utf8'))
            logger.info(f'model > {data}')
            confirmation = data.get('confirmation')
            if confirmation:
                return confirmation
            logger.info('Confirmation not found in loaded user data')
            return False
        except BadSignature:
            logger.info('The json token has expired or malformed')
            return False
        

class Contact(models.Model):
    first_name = models.CharField(max_length=500)
    last_name = models.CharField(max_length=500)
    email = models.CharField(max_length=250)
    phone_number = models.CharField(max_length=100)
    details = models.TextField()




class Permission(models.Model):
    name = models.CharField(max_length=50, unique=True)
    app_label = models.CharField(max_length=50)

    def __str__(self):
        return self.name

# Update signal in models.py
def register_permissions(permissions, app_label):
    for perm in permissions:
        Permission.objects.get_or_create(name=perm, app_label=app_label)