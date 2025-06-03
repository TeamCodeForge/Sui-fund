from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from main.models import User
from decimal import Decimal
from ajo.models import SavingsGroup, AjoUser, MyNotification
import logging
import json

# Get logger for this module
logger = logging.getLogger(__name__)


class SavingsGroupViewSetTestCase(APITestCase):
    """
    Test cases for SavingsGroup ViewSet
    """
    
    def setUp(self):
        """
        Set up test data
        """
        self.client = APIClient()
        
        # Create test users using the provided function
        self.user1 = self._create_user('user1@example.com')
        self.user2 = self._create_user('user2@example.com')
        self.user3 = self._create_user('user3@example.com')
        
        # Create test savings group
        self.savings_group = SavingsGroup.objects.create(
            name='Test Group',
            cycle_duration_days=30,
            start_cycle=1,
            contribution_amount=Decimal('100.0000'),
            active=True
        )
        self.savings_group.participants.add(self.user1, self.user2)
        
        # Create inactive group
        self.inactive_group = SavingsGroup.objects.create(
            name='Inactive Group',
            cycle_duration_days=60,
            start_cycle=1,
            contribution_amount=Decimal('200.0000'),
            active=False
        )
        self.inactive_group.participants.add(self.user1)
    
    def _create_user(self, email):
        """
        Helper function to create users for testing
        """
        user = User.objects.create(email=email)
        user.set_password('set@12345')
        user.confirmed = True
        user.customer_id = '12342432'
        user.save()
        
        AjoUser.objects.create(
            user = user,
            wallet_address = '0x123423423432'
        )
        return user
    
    def _log_response(self, test_name, response):
        """
        Helper method to log API response details
        """
        
        try:
            response_json = json.dumps(response.data, indent=2, default=str)
            logger.debug(f"Response JSON:\n{response_json}")
        except Exception as e:
            logger.debug(f"Could not serialize response data: {e}")
           
    
    def test_list_savings_groups_authenticated(self):
        """
        Test that authenticated users can list their savings groups
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse('savingsgroup-list')
        response = self.client.get(url)
        
        self._log_response("LIST SAVINGS GROUPS (AUTHENTICATED)", response)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        logger.debug(response.json())
        self.assertEqual(response.json()['count'], 2)  # user1 is in 2 groups
    

    def test_create_savings_group(self):
        """
        Test creating a new savings group with notifications
        """
        
        user2 = self._create_user('user22@example.com')
        user3 = self._create_user('user33@example.com')
        
        
        self.client.force_authenticate(user=self.user1)
        url = reverse('savingsgroup-list')
        
        data = {
            'name': 'New Test Group',
            'cycle_duration_days': 45,
            'start_cycle': 1,
            'description': 'This is a savings group',
            'description': 'Group workds',
            'contribution_amount': '150.0000',
            'participant_ids': [user2.id, user3.id],
            'active': False,
            'address_link': '0xewerererer'
        }
        
        logger.debug(f"\n=== CREATE SAVINGS GROUP - REQUEST DATA ===")
        logger.debug(f"Request Data: {json.dumps(data, indent=2)}")
        
        MyNotification.objects.all().delete()
        
        initial_notification_count = MyNotification.objects.count()
        response = self.client.post(url, data, format='json')
        
        self._log_response("CREATE SAVINGS GROUP", response)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check if group was created
        created_group = SavingsGroup.objects.get(name='New Test Group')
        self.assertEqual(created_group.cycle_duration_days, 45)
        self.assertEqual(created_group.contribution_amount, Decimal('150.0000'))
        
        # Check if creator was added as participant
        self.assertIn(self.user1, created_group.participants.all())
        
        
        # Check if notifications were created (creator + 2 participants = 3 notifications)
        final_notification_count = MyNotification.objects.count()
        self.assertEqual(final_notification_count, initial_notification_count + 3)
        
        # Check notification content
        creator_notification = MyNotification.objects.filter(
            user=self.user1,
            message__icontains='successfully created'
        ).first()
        self.assertIsNotNone(creator_notification)
        
        invitation_notifications = MyNotification.objects.filter(
            message__icontains='invited to join'
        )
        self.assertEqual(invitation_notifications.count(), 2)


        
    def test_participants_list(self):
        """
        Test getting list of participants in a group
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse('savingsgroup-participants-list', kwargs={'pk': self.savings_group.pk})
        
        response = self.client.get(url)
        
        self._log_response("PARTICIPANTS LIST", response)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['group_name'], 'Test Group')
        self.assertEqual(response.data['total_participants'], 2)
        self.assertEqual(len(response.data['participants']), 2)
    
    def test_active_groups(self):
        """
        Test getting active groups for authenticated user
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse('savingsgroup-active-groups')
        
        response = self.client.get(url)
        
        self._log_response("ACTIVE GROUPS", response)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # user1 has 1 active group
        self.assertEqual(response.data[0]['name'], 'Test Group')
    
        
    def test_user_can_only_see_their_groups(self):
        """
        Test that users can only see groups they participate in
        """
        # Create a group that user3 is not part of
        other_group = SavingsGroup.objects.create(
            name='Other Group',
            cycle_duration_days=20,
            start_cycle=1,
            contribution_amount=Decimal('50.0000'),
            active=True
        )
        other_group.participants.add(self.user1)
        
        self.client.force_authenticate(user=self.user3)
        url = reverse('savingsgroup-list')
        response = self.client.get(url)
        
        self._log_response("USER CAN ONLY SEE THEIR GROUPS - LIST", response)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 0)  # user3 is not in any groups
        
        # Check that user3 cannot access the group detail
        detail_url = reverse('savingsgroup-detail', kwargs={'pk': other_group.pk})
        detail_response = self.client.get(detail_url)
        
        self._log_response("USER CAN ONLY SEE THEIR GROUPS - DETAIL", detail_response)
        
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
  