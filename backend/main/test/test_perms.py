# tests/test_product_viewsets.py
from django.test import TestCase
from logging import getLogger
from main import models
from django.apps import apps # Import the app config

logger = getLogger(__name__)

class ProductPermTests(TestCase):
    def setUp(self):
        # Simulate app initialization to register permissions
        product_config = apps.get_app_config('main')
        product_config.ready()

    def test_permissions_registered(self):
        logger.debug('started')
        count = models.Permission.objects.filter(app_label='main').count()
        logger.debug(f'Found {count} permissions')
        self.assertEqual(count, 1)
        logger.debug('ended')