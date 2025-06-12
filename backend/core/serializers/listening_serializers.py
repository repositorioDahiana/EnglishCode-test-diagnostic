from rest_framework import serializers
from core.models.sections.listening import ListeningTest, ListeningBlock, ListeningQuestion, ListeningOption

class ListeningOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListeningOption
        fields = ['id', 'option_text', 'is_correct']

class ListeningQuestionSerializer(serializers.ModelSerializer):
    options = ListeningOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = ListeningQuestion
        fields = ['id', 'question_text', 'question_type', 'options']

class ListeningBlockSerializer(serializers.ModelSerializer):
    questions = ListeningQuestionSerializer(many=True, read_only=True)
    video_file = serializers.SerializerMethodField()
    
    class Meta:
        model = ListeningBlock
        fields = ['id', 'video_file', 'instructions', 'questions']

    def get_video_file(self, obj):
        if obj.video_file:
            return obj.video_file.url
        return None

class ListeningTestSerializer(serializers.ModelSerializer):
    blocks = ListeningBlockSerializer(many=True, read_only=True)
    vertical_display = serializers.CharField(source='get_vertical_display', read_only=True)
    
    class Meta:
        model = ListeningTest
        fields = ['id', 'title', 'description', 'vertical', 'vertical_display', 'blocks'] 