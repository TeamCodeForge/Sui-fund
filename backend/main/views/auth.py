from main import models
from rest_framework import viewsets, response, status

from rest_framework import permissions, mixins
from django.template.loader import render_to_string
from main.tasks import celery_send_email
from django.conf import settings
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from main import serializer
from rest_framework.decorators import action
from rest_framework import status, permissions
from django.urls import reverse
from django.template.loader import render_to_string
from main.perm import Authenticated
from logging import getLogger
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from social_django.utils import psa
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import RefreshToken
from main.models import Permission
from rest_framework_simplejwt.views import TokenViewBase
from main.serializer import ClientTokenObtainPairSerializer, AdminTokenObtainPairSerializer


logger = getLogger(__name__)



class ClientTokenView(TokenViewBase):
    serializer_class = ClientTokenObtainPairSerializer

class AdminTokenView(TokenViewBase):
    serializer_class = AdminTokenObtainPairSerializer



class RegistrationView(viewsets.GenericViewSet):
    serializer_class = serializer.RegistrationSerializer
    queryset = models.User.objects.order_by('-id')
    permission_classes = [permissions.AllowAny,]

    def create(self, request):
        data = request.data
        sr = self.serializer_class(data = data)
        if not sr.is_valid():
            return response.Response({'message': sr.errors}, status = 400)

        success = sr.save(link = request.build_absolute_uri(reverse("confirm-list")))
        if not success:
            return response.Response({'message': 'User email already in use'}, status = 406)
        
        return response.Response({'message': "A confirmation email has been sent to your mailbox."})

class ConfirmEmailView(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny,]
    
    def list(self, request):
        token = request.GET.get('token')
        logger.debug(f'confirmation_email_view > list > token {token}')

        if not token:
            return response.Response('Failed', status = 400)

        user_id = models.User.load_user(token)
        logger.info(f'confirm_user_account > the user id is {user_id}')
        if user_id:
            user = models.User.objects.get(app_user_id = user_id)
            if user:
                logger.info('user account is confirmed')
                user.confirmed = True
                user.save()
                return response.Response(status = 302, headers={'Location': settings.FRONTEND_HOME})
            else:
                logger.info('User was not found in database')
                return response.Response('User not Found in Database', status = 400)
        else:
            return response.Response('No user id', status = 400)

    @action(detail = False, methods = ['POST',])
    def resend(self, request):

        data = request.data
        email = data.get('email', None)
        if not email:
            return response.Response({'message': 'An email is required'}, status = 400)

        user = models.User.objects.filter(email = email).first()
        if not user:
            return response.Response({'message': 'User email not registered with our system'}, status = 406)

        link = request.build_absolute_uri(f'{reverse("confirm-list")}?token={user.generate_confirmation_token()}')
        message = render_to_string('mail/confirmation.html', {'email': user.email, 'link': link})


        try:
            celery_send_email.delay(
            subject='Email Confirmation',
             message=link, 
             from_email=settings.EMAIL_DEFAULT_SENDER, 
             recipient_list=[email,],
             fail_silently = False, 
             html_message = message)
            return response.Response({'message': 'Email Sent!'}, status = 200)

        except:
            logger.exception('Sending exception ...')
            return response.Response({'message': 'Error'}, status = 400)

class PasswordResetView(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny, ]

    def send_mail(self, email, link):
        logger.info(f'Sending forgot password email to user {email}')
        message = render_to_string('mail/reset-password.html', {'email': email, 'link': link})
        celery_send_email.delay(subject='Reset Password', message=link, from_email=settings.EMAIL_DEFAULT_SENDER, recipient_list=[email,], fail_silently = False, html_message = message)

    def create(self, request):
        data = request.data
        email = data.get('email', None)

        if not email:
            return response.Response({'message': 'No email provided'}, status = 400)

        user = models.User.objects.filter(email = email).first()
        if not user:
            return response.Response({'message': 'Email not registered with this service'}, status = 406)

        logger.info('Password rest ready.')
        self.send_mail(user.email, f'{settings.FRONTEND_HOME + "/auth/new/"}?token={user.generate_confirmation_token()}')

        return response.Response({'message': 'Reset Email has been sent to your MailBox'})

    @action(detail = False, methods = ['POST',])
    def new(self, request):
        payload = request.data
        sr = serializer.PasswordSerializer(data = payload)

        if not sr.is_valid():
            logger.debug(f'''passwordRest: {payload}''')
            return response.Response({'message': sr.errors}, status = 400)

        token = sr.validated_data['token']
        logger.debug(f'confirmation_email_view > list > token {token}')

        if not token:
            return response.Response('Failed', status = 400)

        user_id = models.User.load_user(token)
        logger.info(f'confirm_user_account > the user id is {user_id}')
        if user_id:
            user = models.User.objects.get(app_user_id = user_id)
            if user:
                logger.info('user account is confirmed')

                try:
                    validate_password(sr.validated_data['password'], user = request.user)
                    logger.debug(f'password_reset_view > create > the password passed the validation!')
                except ValidationError as e:
                    logger.debug(f'password_reset_view > create > validation error raised!')
                    error_messages = ''
                    # Access the error messages
                    error_messages = e.message_dict
                    for field, errors in error_messages.items():
                        for error in errors:
                            error_messages += '\n error'

                    return response.Response({'message': error_messages}, status = 406)

                #continue with password update
                user.set_password(sr.validated_data['password'])
                user.save()
                return response.Response({'message': 'Password updated!'})
            else:
                logger.info('User was not found in database')
                return response.Response('User not Found in Database', status = 400)
        else:
            return response.Response('No user id', status = 400)



class User(viewsets.GenericViewSet):
    permission_classes = [Authenticated,]
    serializer_class = serializer.UserSerializer

    def list(self, request, pk = None):
        user = request.user
        serial = self.serializer_class(user)
        return response.Response(serial.data)
    

@psa('social:complete')
def register_by_access_token(request, backend):
    # This view expects an access_token GET parameter, if it's needed,
    # request.backend and request.strategy will be loaded with the current
    # backend and strategy.
    token = request.GET.get('access_token')
    user = request.backend.do_auth(token)
    if user:
        user.confirmed = True        
        user.save()
        refresh = RefreshToken.for_user(user)
        payload = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            }
        return JsonResponse(payload)
    else:
        return JsonResponse({'message': 'No registered account found'}, status=400)