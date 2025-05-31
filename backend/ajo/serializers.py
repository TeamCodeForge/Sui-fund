# serializers.py
from rest_framework import serializers
from main.models import User
from .models import AjoUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class AjoUserSerializer(serializers.ModelSerializer):
    """Serializer for the AjoUser model"""
    user = UserSerializer(read_only=True)
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
