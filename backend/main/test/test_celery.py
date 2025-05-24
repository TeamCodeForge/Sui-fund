from django.test import TestCase
from main import models
from main.tasks import celery_send_email
from main.mailer import SesMailSender
from django.test.utils import override_settings
from django.conf import settings


class CeleryTest(TestCase):

    def _create_user(self, email):
        user = models.User.objects.create_user(
            username='regular',
            email='regular@example.com',
            password='regularpass',
            first_name='Regular',
            last_name='User',
            confirmed = True
            
        )

        return user

    
    def test_send_mail(self):
        assert celery_send_email.run(
            subject = 'Testing Email sending',
            message = 'thank you',
            recipient_list = ['sethdad224@gmail.com',],
            from_email = settings.EMAIL_DEFAULT_SENDER,
            html_message = '<b> This is to test that the email sending is working </b>',
            fail_silently = False
            )