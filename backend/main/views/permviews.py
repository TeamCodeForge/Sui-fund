# products.py
from rest_framework import viewsets
from rest_framework.response import Response
from main.perm import Authenticated
from main.models import Permission


class PermViewset( viewsets.ViewSet):
    permission_classes = [Authenticated,]
    
    def list(self, request):
        permissions = [(perm.name,perm.app_label )for perm in Permission.objects.all()]
        return Response(permissions, status = 200)
    
