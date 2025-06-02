from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from logging import getLogger
from ajo.models import SavingsGroup, AjoUser, MyNotification
from ajo.serializers import (
    SavingsGroupSerializer,
    SavingsGroupCreateSerializer,
    SavingsGroupListSerializer,
    AjoUserSerializer
)


logger = getLogger(__name__)
class SavingsGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing savings groups.
    Provides CRUD operations and custom actions for savings group management.
    """
    queryset = SavingsGroup.objects.all()
    serializer_class = SavingsGroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """
        Return the appropriate serializer class based on the action.
        """
        if self.action == 'create':
            return SavingsGroupCreateSerializer
        elif self.action == 'list':
            return SavingsGroupListSerializer
        elif self.action in ['active_groups', 'inactive_groups']:
            return SavingsGroupListSerializer
        return SavingsGroupSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions.
        Users can only see groups they participate in.
        """
        return SavingsGroup.objects.filter(participants=self.request.user)
    
    def perform_create(self, serializer):
        """
        Automatically add the creator as a participant when creating a group
        and send notifications to all participants.
        """
        savings_group = serializer.save()
        savings_group.participants.add(self.request.user)
        
        # Send notifications to all participants (including creator)
        self.send_group_creation_notifications(savings_group)
    
    def send_group_creation_notifications(self, savings_group):
        """
        Send notification to all participants about the new savings group.
        """
        creator = self.request.user
        participants = savings_group.participants.all()
        
        notifications = []
        for participant in participants:
            if participant == creator:
                # Different message for the creator
                message = f"You have successfully created the savings group '{savings_group.name}'. Your contribution cycle starts soon!"
            else:
                # Message for invited participants
                message = f"You have been invited to join the savings group '{savings_group.name}' by {creator.get_full_name() or creator.username}. Welcome to the contribution!"
            
            notification = MyNotification(
                user=participant,
                message=message,
                #notification_type='group_invitation',  # Assuming this field exists
                is_read=False
            )
            notifications.append(notification)
        
        # Bulk create notifications for efficiency
        MyNotification.objects.bulk_create(notifications)
    
    @action(detail=True, methods=['post'])
    def join_group(self, request, pk=None):
        """
        Allow a user to join an existing savings group.
        """
        savings_group = self.get_object()
        logger.debug(savings_group)
        user = request.user
        
        if user in savings_group.participants.all():
            return Response(
                {'detail': 'You are already a member of this group.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        savings_group.participants.add(user)
        
        # Send notification to the user who joined
        MyNotification.objects.create(
            user=user,
            message=f"You have successfully joined the savings group '{savings_group.name}'. Welcome!",
            notification_type='group_joined',
            is_read=False
        )
        
        # Notify other group members about the new participant
        other_participants = savings_group.participants.exclude(id=user.id)
        notifications = [
            MyNotification(
                user=participant,
                message=f"{user.get_full_name() or user.username} has joined the savings group '{savings_group.name}'.",
                notification_type='member_joined',
                is_read=False
            )
            for participant in other_participants
        ]
        MyNotification.objects.bulk_create(notifications)
        
        return Response(
            {'detail': 'Successfully joined the savings group.'}, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def leave_group(self, request, pk=None):
        """
        Allow a user to leave a savings group.
        """
        savings_group = self.get_object()
        user = request.user
        
        if user not in savings_group.participants.all():
            return Response(
                {'detail': 'You are not a member of this group.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        savings_group.participants.remove(user)
        return Response(
            {'detail': 'Successfully left the savings group.'}, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def activate_group(self, request, pk=None):
        """
        Activate a savings group (admin action).
        """
        savings_group = self.get_object()
        
        if savings_group.active:
            return Response(
                {'detail': 'Group is already active.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        savings_group.active = True
        savings_group.save()
        
        return Response(
            {'detail': 'Savings group activated successfully.'}, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def deactivate_group(self, request, pk=None):
        """
        Deactivate a savings group (admin action).
        """
        savings_group = self.get_object()
        
        if not savings_group.active:
            return Response(
                {'detail': 'Group is already inactive.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        savings_group.active = False
        savings_group.save()
        
        return Response(
            {'detail': 'Savings group deactivated successfully.'}, 
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def participants_list(self, request, pk=None):
        """
        Get list of all participants in a savings group.
        """
        savings_group = self.get_object()
        participants = savings_group.participants.all()
        
        # Use the AjoUserSerializer for consistent participant data
        
        participant_serializer = AjoUserSerializer(participants, many=True)
        
        return Response(
            {
                'group_name': savings_group.name,
                'total_participants': participants.count(),
                'participants': participant_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def active_groups(self, request):
        """
        Get all active savings groups that the user participates in.
        """
        active_groups = self.get_queryset().filter(active=True)
        serializer = self.get_serializer(active_groups, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def inactive_groups(self, request):
        """
        Get all inactive savings groups that the user participates in.
        """
        inactive_groups = self.get_queryset().filter(active=False)
        serializer = self.get_serializer(inactive_groups, many=True)
        return Response(serializer.data)