from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import (
    ListeningTestViewSet, ListeningBlockViewSet, ListeningQuestionViewSet, ListeningOptionViewSet,
    ReadingTestViewSet, ReadingBlockViewSet, ReadingQuestionViewSet, ReadingOptionViewSet,
    WritingTestViewSet, WritingBlockViewSet,
    SpeakingTestViewSet, SpeakingBlockViewSet
)
from core.viewsets.user_viewsets import UserProfileViewSet
from core.viewsets.user_viewsets import auth0_login_view

router = DefaultRouter()

# Listening routes
router.register(r'listening/tests', ListeningTestViewSet)
router.register(r'listening/blocks', ListeningBlockViewSet)
router.register(r'listening/questions', ListeningQuestionViewSet)
router.register(r'listening/options', ListeningOptionViewSet)

# Reading routes
router.register(r'reading/tests', ReadingTestViewSet)
router.register(r'reading/blocks', ReadingBlockViewSet)
router.register(r'reading/questions', ReadingQuestionViewSet)
router.register(r'reading/options', ReadingOptionViewSet)

# Writing routes
router.register(r'writing/tests', WritingTestViewSet)
router.register(r'writing/blocks', WritingBlockViewSet)

# Speaking routes
router.register(r'speaking/tests', SpeakingTestViewSet)
router.register(r'speaking/blocks', SpeakingBlockViewSet)

# User Profile routes
router.register(r'users', UserProfileViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/auth0-login/', auth0_login_view),
]