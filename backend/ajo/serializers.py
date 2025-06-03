# serializers.py
from rest_framework import serializers
from main.models import User
from .models import AjoUser
from rest_framework import serializers
from .models import SavingsGroup
from logging import getLogger

logger = getLogger(__name__)



class AUserSerializer(serializers.ModelSerializer):
    """Serializer for the User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class AjoUserSerializer(serializers.ModelSerializer):
    """Serializer for the AjoUser model"""
    user = AUserSerializer(read_only=True)
    #user_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = AjoUser
        fields = ['id', 'user',  'wallet_address']
        read_only_fields = ['id',]
    
    def create(self, validated_data):
        # If user_id is not provided, use the current authenticated user
        if 'user_id' not in validated_data:
            validated_data['user'] = self.context['request'].user
        else:
            user_id = validated_data.pop('user_id')
            validated_data['user'] = User.objects.get(id=user_id)
        
        return super().create(validated_data)
    
    def validate_wallet_address(self, value):
        """Validate wallet address format if needed"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Wallet address cannot be empty")
        
        # Add any specific wallet address validation logic here
        # For example, for Ethereum addresses:
        # if not value.startswith('0x') or len(value) != 42:
        #     raise serializers.ValidationError("Invalid wallet address format")
        
        return value.strip()


class SavingsGroupSerializer(serializers.ModelSerializer):
    """
    Serializer for SavingsGroup model with nested participant information.
    """
    participants = AjoUserSerializer(many=True, read_only=True)
    participants_count = serializers.SerializerMethodField()
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of user IDs to add as participants"
    )
    
    class Meta:
        model = SavingsGroup
        fields = [
            'id',
            'name',
            'cycle_duration_days',
            'start_cycle',
            'contribution_amount',
            'participants',
            
            'participants_count',
            'participant_ids',
            'active',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_participants_count(self, obj):
        """
        Return the total number of participants in the group.
        """
        return obj.participants.count()
    
    def validate_cycle_duration_days(self, value):
        """
        Validate that cycle duration is reasonable (between 1 and 365 days).
        """
        if value < 1:
            raise serializers.ValidationError("Cycle duration must be at least 1 day.")
        if value > 365:
            raise serializers.ValidationError("Cycle duration cannot exceed 365 days.")
        return value
    
    def validate_start_cycle(self, value):
        """
        Validate that start cycle is a positive integer.
        """
        if value < 1:
            raise serializers.ValidationError("Start cycle must be at least 1.")
        return value
    
    def validate_contribution_amount(self, value):
        """
        Validate that contribution amount is positive.
        """
        if value <= 0:
            raise serializers.ValidationError("Contribution amount must be greater than 0.")
        return value
    
    def validate_participant_ids(self, value):
        """
        Validate that all participant IDs exist and are valid users.
        """
        if value:
            existing_users = AjoUser.objects.filter(id__in=value)
            if existing_users.count() != len(value):
                invalid_ids = set(value) - set(existing_users.values_list('id', flat=True))
                raise serializers.ValidationError(
                    f"Invalid user IDs: {list(invalid_ids)}"
                )
        return value
    
    def create(self, validated_data):
        """
        Create a new savings group and add participants if provided.
        """
        participant_ids = validated_data.pop('participant_ids', [])
        savings_group = SavingsGroup.objects.create(**validated_data)
        
        if participant_ids:
            participants = AjoUser.objects.filter(id__in=participant_ids)
            savings_group.participants.set(participants.values_list('id', flat=True))
        
        return savings_group
    
    def update(self, instance, validated_data):
        """
        Update savings group and handle participant changes.
        """
        participant_ids = validated_data.pop('participant_ids', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update participants if provided
        if participant_ids is not None:
            participants = AjoUser.objects.filter(id__in=participant_ids)
            instance.participants.set(participants)
        
        return instance


class SavingsGroupCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating savings groups without nested participant data.
    """
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text="List of user IDs to add as participants"
    )
    
    class Meta:
        model = SavingsGroup
        fields = [
            'name',
            'cycle_duration_days',
            'start_cycle',
            'contribution_amount',
            'description',
            'participant_ids',
            'address_link',
            'digest'
        ]
    
    def validate_cycle_duration_days(self, value):
        if value < 1 or value > 365:
            raise serializers.ValidationError("Cycle duration must be between 1 and 365 days.")
        return value
    
    def validate_contribution_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Contribution amount must be greater than 0.")
        return value
    
    def create(self, validated_data):
        participant_ids = validated_data.pop('participant_ids', [])
        savings_group = SavingsGroup.objects.create(**validated_data)
        
        logger.debug(participant_ids)
        if participant_ids:
            participants = User.objects.filter(id__in=participant_ids)
            savings_group.participants.set(participants.values_list('id', flat=True))
        
        return savings_group


class SavingsGroupListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for listing savings groups with essential information only.
    """
    participants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SavingsGroup
        fields = [
            'id',
            'name',
            'cycle_duration_days',
            'contribution_amount',
            'participants_count',
            'description',
            'active',
            'address_link',
            'digest'
        ]
    
    def get_participants_count(self, obj):
        return obj.participants.count()