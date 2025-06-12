from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from core.models.sections.user_profile import UserProfile
from core.serializers.user_serializers import UserProfileSerializer

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]  # Puedes cambiarlo luego por IsAuthenticated si activas login

    def get_queryset(self):
        queryset = super().get_queryset()
        email = self.request.query_params.get('email', None)
        if email:
            queryset = queryset.filter(email=email)
        return queryset
