from rest_framework import serializers
from core.models.sections.user_profile import UserProfile
from core.constants import VERTICAL_CHOICES

class UserProfileSerializer(serializers.ModelSerializer):
    vertical_display = serializers.SerializerMethodField()
    nivel_display = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'email', 'name', 'vertical', 'vertical_display',
            'resultado_listening', 'resultado_speaking', 'resultado_writing', 'resultado_reading',
            'resultado_general', 'nivel', 'nivel_display',
            'fecha_creacion', 'fecha_actualizacion', 'puede_intentar_test',
            'intentos_realizados', 'fecha_bloqueo'
        ]
        read_only_fields = ['resultado_general', 'nivel']

    def get_vertical_display(self, obj):
        return obj.get_vertical_display()

    def get_nivel_display(self, obj):
        return obj.get_nivel_display()
    
    puede_intentar_test = serializers.SerializerMethodField()

    def get_puede_intentar_test(self, obj):
        return obj.puede_intentar_test()