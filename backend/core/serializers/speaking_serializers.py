from rest_framework import serializers
from core.models.sections.speaking import SpeakingTest, SpeakingBlock

class SpeakingBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpeakingBlock
        fields = ['id', 'text', 'instruction', 'example']

class SpeakingTestSerializer(serializers.ModelSerializer):
    speaking_blocks = SpeakingBlockSerializer(many=True, read_only=True)
    vertical_display = serializers.CharField(source='get_vertical_display', read_only=True)
    
    class Meta:
        model = SpeakingTest
        fields = ['id', 'title', 'description', 'vertical', 'vertical_display', 'speaking_blocks'] 