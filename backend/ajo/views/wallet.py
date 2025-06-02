

# views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from ajo.models import AjoUser
from ajo.serializers import AjoUserSerializer


class AjoUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AjoUser instances.
    
    Provides CRUD operations for AjoUser model with the following endpoints:
    - GET /ajo-users/ - List all AjoUsers
    - POST /ajo-users/ - Create a new AjoUser
    - GET /ajo-users/{id}/ - Retrieve a specific AjoUser
    - PUT /ajo-users/{id}/ - Update a specific AjoUser
    - PATCH /ajo-users/{id}/ - Partially update a specific AjoUser
    - DELETE /ajo-users/{id}/ - Delete a specific AjoUser
    - GET /ajo-users/my-profile/ - Get current user's AjoUser profile
    """
    
    queryset = AjoUser.objects.select_related('user').order_by('-id')
    serializer_class = AjoUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        Override get_object to return the current user's AjoUser profile
        instead of requiring an ID in the URL.
        """
        try:
            return AjoUser.objects.get(user=self.request.user)
        except AjoUser.DoesNotExist:
            # This will raise a 404 error
            from django.http import Http404
            raise Http404("AjoUser profile not found for current user.")
    
    def perform_create(self, serializer):
        """
        Set the user to the current authenticated user if not specified.
        """
        
        if hasattr(self.request.user, 'ajo'):
            return
        
        if not serializer.validated_data.get('user'):
            serializer.save(user=self.request.user)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'], url_path='my-profile')
    def my_profile(self, request):
        """
        Get the current user's AjoUser profile.
        """
        try:
            ajo_user = AjoUser.objects.get(user=request.user)
            serializer = self.get_serializer(ajo_user)
            return Response(serializer.data)
        except AjoUser.DoesNotExist:
            return Response(
                {'detail': 'AjoUser profile not found for current user.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='create-profile')
    def create_profile(self, request):
        """
        Create an AjoUser profile for the current user.
        """
        # Check if user already has an AjoUser profile
        if AjoUser.objects.filter(user=request.user).exists():
            return Response(
                {'detail': 'AjoUser profile already exists for current user.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['patch'], url_path='update-wallet')
    def update_wallet(self, request):
        """
        Update the wallet address for the current user's AjoUser profile.
        """
        try:
            ajo_user = AjoUser.objects.get(user=request.user)
        except AjoUser.DoesNotExist:
            return Response(
                {'detail': 'AjoUser profile not found for current user.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        wallet_address = request.data.get('wallet_address')
        if not wallet_address:
            return Response(
                {'detail': 'wallet_address is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(
            ajo_user, 
            data={'wallet_address': wallet_address}, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


