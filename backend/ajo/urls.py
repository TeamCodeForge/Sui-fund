from rest_framework import routers
from main.views import auth, permviews
from django.urls import path, include
from ajo.views.wallet import AjoUserViewSet
from ajo.views.groups import SavingsGroupViewSet


router = routers.DefaultRouter()
router.register(r'ajo-users', AjoUserViewSet, basename='ajouser')
router.register(r'savingsgroup', SavingsGroupViewSet, basename='savingsgroup')

urlpatterns = [
    path('', include(router.urls)),
]