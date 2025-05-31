from rest_framework import routers
from main.views import auth, permviews
from django.urls import path, include
from ajo.views.wallet import AjoUserViewSet


router = routers.DefaultRouter()
router.register(r'ajo-users', AjoUserViewSet, basename='ajouser')

urlpatterns = [
    path('', include(router.urls)),
]