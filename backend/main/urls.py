from rest_framework import routers
from main.views import auth, permviews
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView




router = routers.DefaultRouter()
router.register(r'register', auth.RegistrationView, basename='registration')
router.register(r'user', auth.User, basename='user')
router.register(r'confirm', auth.ConfirmEmailView, basename='confirm')
router.register(r'password/reset', auth.PasswordResetView, basename='password')
router.register(r'perms', permviews.PermViewset, basename='perms')

urlpatterns = [
    path('', include(router.urls)),
    path('social/', include('social_django.urls', namespace='social')),
    path('token/',auth.ClientTokenView.as_view(), name='token_obtain_pair'),
    path('refreshToken/', TokenRefreshView.as_view(), name='token_refresh'),
    path('tokenize/<backend>/', auth.register_by_access_token, name='tokenizer')
]