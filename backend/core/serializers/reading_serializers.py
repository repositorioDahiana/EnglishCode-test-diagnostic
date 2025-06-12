from rest_framework import serializers
from core.models.sections.reading import ReadingTest, ReadingBlock, ReadingQuestion, ReadingOption

class ReadingOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadingOption
        fields = ['id', 'option_text', 'is_correct']

class ReadingQuestionSerializer(serializers.ModelSerializer):
    options = ReadingOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = ReadingQuestion
        fields = ['id', 'question_text', 'options']

class ReadingBlockSerializer(serializers.ModelSerializer):
    questions = ReadingQuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = ReadingBlock
        fields = ['id', 'title', 'content', 'questions']

class ReadingTestSerializer(serializers.ModelSerializer):
    reading_blocks = ReadingBlockSerializer(many=True, read_only=True)
    vertical_display = serializers.CharField(source='get_vertical_display', read_only=True)
    
    class Meta:
        model = ReadingTest
        fields = ['id', 'title', 'description', 'vertical', 'vertical_display', 'reading_blocks'] 