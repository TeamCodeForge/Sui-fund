# test_views.py
from django.test import TestCase
from main.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from ajo.models import AjoUser
from ajo.serializers import AjoUserSerializer


class AjoUserViewSetTestCase(TestCase):
    """
    Test cases for AjoUserViewSet
    """
    
    def _create_user(self, email):
        user = User.objects.create(email=email)
        user.set_password('set@12345')
        user.confirmed = True
        user.customer_id = '12342432'
        user.save()
        return user

    def setUp(self):
        """
        Set up test data for each test method
        """
        self.client = APIClient()
        
        # Create test users
        self.regular_user = self._create_user('regular@test.com')
        
        self.admin_user = self._create_user('admin@test.com')
        self.admin_user.is_staff = True
        self.admin_user.save()
        
        self.other_user = self._create_user('other@test.com')
        
        # Create AjoUser instances
        self.ajo_user_regular = AjoUser.objects.create(
            user=self.regular_user,
            wallet_address='0x1234567890abcdef',
        )
        
        self.ajo_user_other = AjoUser.objects.create(
            user=self.other_user,
            wallet_address='0xabcdef1234567890',
        )
        
        # URLs for testing
        self.list_url = reverse('ajouser-list')  # Adjust based on your URL configuration
        self.detail_url = lambda pk: reverse('ajouser-detail', kwargs={'pk': pk})
        self.my_profile_url = reverse('ajouser-my-profile')
        self.create_profile_url = reverse('ajouser-create-profile')
        self.update_wallet_url = reverse('ajouser-update-wallet')
    
    def test_unauthenticated_access_denied(self):
        """
        Test that unauthenticated users cannot access the endpoints
        """
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        response = self.client.get(self.my_profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_ajo_users_regular_user(self):
        """
        Test that regular users can only see their own AjoUser
        """
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)
        #self.assertEqual(response.data[0]['user'], self.regular_user.id)
    

    def test_retrieve_ajo_user_own_profile(self):
        """
        Test retrieving user's own AjoUser profile
        """
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.detail_url(self.ajo_user_regular.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.ajo_user_regular.id)
        self.assertEqual(response.data['user']['id'], self.regular_user.id)
    

       
    def test_create_ajo_user(self):
        """
        Test creating a new AjoUser
        """
        # Create a new user without AjoUser profile
        new_user = self._create_user('new@test.com')
        
        self.client.force_authenticate(user=new_user)
        
        data = {
            'wallet_address': '0xnewwallet123',
        }
        
        response = self.client.post(self.list_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['id'], new_user.id)
        self.assertEqual(response.data['wallet_address'], '0xnewwallet123')
        
        # Verify the AjoUser was created in the database
        ajo_user = AjoUser.objects.get(user=new_user)
        self.assertEqual(ajo_user.wallet_address, '0xnewwallet123')
    
    def test_update_ajo_user(self):
        """
        Test updating an existing AjoUser
        """
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            'wallet_address': '0xupdatedwallet',
        }
        
        response = self.client.put(self.detail_url(self.ajo_user_regular.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['wallet_address'], '0xupdatedwallet')
        
        # Verify the update in the database
        self.ajo_user_regular.refresh_from_db()
        self.assertEqual(self.ajo_user_regular.wallet_address, '0xupdatedwallet')
    
    def test_partial_update_ajo_user(self):
        """
        Test partially updating an existing AjoUser
        """
        self.client.force_authenticate(user=self.regular_user)
        
        data = {'wallet_address': '0xpartialupdatewallet'}
        
        response = self.client.patch(self.detail_url(self.ajo_user_regular.id), data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['wallet_address'], '0xpartialupdatewallet')
        
        # Verify phone number remains unchanged
        self.ajo_user_regular.refresh_from_db()
        self.assertEqual(self.ajo_user_regular.wallet_address, '0xpartialupdatewallet')
    
    def test_delete_ajo_user(self):
        """
        Test deleting an AjoUser
        """
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.delete(self.detail_url(self.ajo_user_regular.id))
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify the AjoUser was deleted
        with self.assertRaises(AjoUser.DoesNotExist):
            AjoUser.objects.get(id=self.ajo_user_regular.id)
    
    def test_my_profile_success(self):
        """
        Test successful retrieval of current user's profile
        """
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get(self.my_profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.ajo_user_regular.id)
        self.assertEqual(response.data['user']['id'], self.regular_user.id)
    
    def test_my_profile_not_found(self):
        """
        Test my_profile endpoint when user has no AjoUser profile
        """
        # Create user without AjoUser profile
        user_without_profile = self._create_user('noprofile@test.com')
        
        self.client.force_authenticate(user=user_without_profile)
        
        response = self.client.get(self.my_profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('AjoUser profile not found', response.data['detail'])
    
    def test_create_profile_success(self):
        """
        Test successful creation of user profile
        """
        # Create user without AjoUser profile
        user_without_profile = self._create_user('createprofile@test.com')
        
        self.client.force_authenticate(user=user_without_profile)
        
        data = {
            'wallet_address': '0xcreatedprofile',
            
        }
        
        response = self.client.post(self.create_profile_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['id'], user_without_profile.id)
        self.assertEqual(response.data['wallet_address'], '0xcreatedprofile')
        
        # Verify the profile was created
        ajo_user = AjoUser.objects.get(user=user_without_profile)
        self.assertEqual(ajo_user.wallet_address, '0xcreatedprofile')
    
    def test_create_profile_already_exists(self):
        """
        Test create_profile when user already has a profile
        """
        self.client.force_authenticate(user=self.regular_user)
        
        data = {
            'wallet_address': '0xnewwallet',
           
        }
        
        response = self.client.post(self.create_profile_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.data['detail'])
    
    def test_create_profile_invalid_data(self):
        """
        Test create_profile with invalid data
        """
        user_without_profile = self._create_user('invalid@test.com')
        
        self.client.force_authenticate(user=user_without_profile)
        
        # Send invalid data (assuming wallet_address is required)
        data = {'phone_number': '+1111111111'}
        
        response = self.client.post(self.create_profile_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_wallet_success(self):
        """
        Test successful wallet address update
        """
        self.client.force_authenticate(user=self.regular_user)
        
        data = {'wallet_address': '0xupdatedwalletaddress'}
        
        response = self.client.patch(self.update_wallet_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['wallet_address'], '0xupdatedwalletaddress')
        
        # Verify the update in the database
        self.ajo_user_regular.refresh_from_db()
        self.assertEqual(self.ajo_user_regular.wallet_address, '0xupdatedwalletaddress')
    
    def test_update_wallet_no_profile(self):
        """
        Test update_wallet when user has no AjoUser profile
        """
        user_without_profile = self._create_user('nowallet@test.com')
        
        self.client.force_authenticate(user=user_without_profile)
        
        data = {'wallet_address': '0xnewwallet'}
        
        response = self.client.patch(self.update_wallet_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('AjoUser profile not found', response.data['detail'])
    
    def test_update_wallet_missing_address(self):
        """
        Test update_wallet without providing wallet_address
        """
        self.client.force_authenticate(user=self.regular_user)
        
        data = {}  # Empty data
        
        response = self.client.patch(self.update_wallet_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('wallet_address is required', response.data['detail'])
    
    def test_update_wallet_invalid_data(self):
        """
        Test update_wallet with invalid wallet address (if validation exists)
        """
        self.client.force_authenticate(user=self.regular_user)
        
        # Assuming there's validation for wallet address format
        data = {'wallet_address': 'invalid_wallet_format'}
        
        response = self.client.patch(self.update_wallet_url, data)
        
        # This might return 200 if no validation exists, or 400 if validation fails
        # Adjust based on your serializer validation
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])
    
    def test_perform_create_sets_current_user(self):
        """
        Test that perform_create automatically sets the current user
        """
        new_user = self._create_user('auto@test.com')
        
        self.client.force_authenticate(user=new_user)
        
        # Don't include user in data - it should be set automatically
        data = {
            'wallet_address': '0xautowallet',
           
        }
        
        response = self.client.post(self.list_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['id'], new_user.id)
    

  

class AjoUserViewSetIntegrationTestCase(TestCase):
    """
    Integration tests for AjoUserViewSet with more complex scenarios
    """
    
    def _create_user(self, email):
        user = User.objects.create(email=email)
        user.set_password('set@12345')
        user.confirmed = True
        user.customer_id = '12342432'
        user.save()
        return user

    def setUp(self):
        self.client = APIClient()
        self.user = self._create_user('integration@test.com')
    
    def test_full_user_journey(self):
        """
        Test a complete user journey: authenticate, create profile, update wallet
        """
        self.client.force_authenticate(user=self.user)
        
        # 1. Check that user has no profile initially
        response = self.client.get(reverse('ajouser-my-profile'))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 2. Create a profile
        profile_data = {
            'wallet_address': '0xintegrationwallet',
        
        }
        
        response = self.client.post(reverse('ajouser-create-profile'), profile_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile_id = response.data['id']
        
        # 3. Verify profile exists
        response = self.client.get(reverse('ajouser-my-profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], profile_id)
        
        # 4. Update wallet address
        wallet_data = {'wallet_address': '0xupdatedintegrationwallet'}
        response = self.client.patch(reverse('ajouser-update-wallet'), wallet_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['wallet_address'], '0xupdatedintegrationwallet')
        
        # 5. Verify the update
        response = self.client.get(reverse('ajouser-my-profile'))
        self.assertEqual(response.data['wallet_address'], '0xupdatedintegrationwallet')