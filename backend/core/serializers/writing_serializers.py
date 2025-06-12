from rest_framework import serializers
from core.models.sections.writing import WritingTest, WritingBlock

class WritingBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = WritingBlock
        fields = ['id', 'text', 'instruction', 'example']

class WritingTestSerializer(serializers.ModelSerializer):
    writing_blocks = WritingBlockSerializer(many=True, read_only=True)
    vertical_display = serializers.CharField(source='get_vertical_display', read_only=True)
    
    class Meta:
        model = WritingTest
        fields = ['id', 'title', 'description', 'vertical', 'vertical_display', 'writing_blocks'] 