from django.core.exceptions import PermissionDenied
from rest_framework import permissions, mixins
from rest_framework_simplejwt.tokens import AccessToken
from logging import getLogger

logger = getLogger(__name__)

class Authenticated(permissions.BasePermission):
    
    def has_permission(self, request, view):
        
        if not request.user.is_authenticated:
            raise PermissionDenied('User is not authenticated.')
        if not request.user.confirmed:
            raise PermissionDenied('User is not confirmed.')

        return True

class AdminAuthenticated(permissions.BasePermission):
    
    def has_permission(self, request, view):
        
        if not request.user.is_authenticated:
            raise PermissionDenied('User is not authenticated.')
        if not request.user.confirmed:
            raise PermissionDenied('User is not confirmed.')

        token = AccessToken(request.META.get('HTTP_AUTHORIZATION').split(' ')[1])
        logger.debug(token.get('user_type'))
        return token.get('user_type') == 'admin'
