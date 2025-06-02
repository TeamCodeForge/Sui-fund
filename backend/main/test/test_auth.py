from django.test import TestCase
from main import models
from django.test.utils import override_settings
from django.urls import reverse
from rest_framework.test import  APIClient
from logging import getLogger
from faker import Faker
from uuid import uuid4
from django.utils.timezone import now
from django.conf import settings
from django.apps import apps
from django.core.files.uploadedfile import SimpleUploadedFile

from django.test import tag




logger = getLogger(__name__)
fake = Faker()

def generate_unique_id():
    _id =  uuid4().hex +  str(now().timestamp()).replace('.','')
    return _id


@tag('excluded')
class AuthTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        
        
        
        

    def _create_user(self, email):
        user = models.User.objects.create(email = email)
        user.set_password('set@12345')
        user.confirmed = True
        user.customer_id = '12342432'
        user.save()

        return user
    
    
  

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
    def test_create_user(self):
        
        product_config = apps.get_app_config('main')
        product_config.ready()
        
        
        
        payload = {
        'first_name': 'Mark Twain',
        'last_name': 'Paulina',
        'username': 'Seth',
        'email': settings.ADMIN_EMAIL.split(',')[0],
        'password': 'Bossman',
        
        }
        
        response = self.client.post(reverse('registration-list'), payload, format = 'json')
        logger.debug(response.json())
        self.assertTrue(response.status_code == 200)
        
        adminuser = models.User.objects.filter(email = payload['email']).first()
        self.assertTrue(adminuser.is_superuser)
        self.assertTrue(adminuser.is_staff)
        self.assertTrue(adminuser.confirmed == True)
        
        
        payload['email'] = 'sethdad224@proton.me'


        response = self.client.post(reverse('registration-list'), payload, format = 'json')
        logger.debug(response.json())
        self.assertTrue(response.status_code == 200)

        user = models.User.objects.filter(email = 'sethdad224@proton.me').first()
        self.assertFalse(user.confirmed)

        confirmation_token = input('Enter Confirmation Token: \t')
        token = confirmation_token.split('?token=')[-1]
        response = self.client.get(f'{reverse("confirm-list")}?token={token}')
        self.assertTrue(response.status_code == 302)

        user = models.User.objects.filter(email = 'sethdad224@proton.me').first()
        self.assertTrue(user.confirmed == True)


    @override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
    def test_reset_password(self):
        self._create_user('sethdad224@proton.me')

        response = self.client.post(reverse('password-list'), {'email': 'sethdad224@proton.me'}, format = 'json')
        token = input('Enter Reset Password Token: ')
        ttoken = token.split('token=')[-1]
        

        response = self.client.post(reverse('password-new'), {'token': ttoken, 'password': 'MangoMan'}, format = 'json')
        logger.debug(response.json())
        self.assertTrue(response.status_code == 200)


        # login with reset password
        response = self.client.post(reverse('token_obtain_pair'), {'email': 'sethdad224@proton.me','password': 'MangoMan'}, format = 'json')
        logger.debug(response.json())
        self.assertTrue(response.status_code == 200)


    @override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
    def test_confirmation_resend(self):
        user = self._create_user('sethdad224@proton.me')
        response = self.client.post(reverse('confirm-resend'), {'email': user.email}, format = 'json')
        logger.debug(response.json())
        self.assertTrue(response.status_code == 200)


        confirmation_token = input('Enter Confirmation Token: \t')
        token = confirmation_token.split('?token=')[-1]
        response = self.client.get(f'{reverse("confirm-list")}?token={token}')
        self.assertTrue(response.status_code == 302)

        user = models.User.objects.filter(email = 'sethdad224@proton.me').first()
        self.assertTrue(user.confirmed == True)
        
        
    def test_client_user(self):
        user = self._create_user('admin@gmail.com')
        user.confirmed = False
        user.save()
        
        self.client.force_authenticate(user)
        response = self.client.get(reverse('user-list'))
        logger.debug(response.json())
        logger.debug(response.status_code == 403)
        
