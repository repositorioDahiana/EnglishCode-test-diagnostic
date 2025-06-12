from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from core.models.sections.reading import ReadingTest, ReadingBlock, ReadingQuestion, ReadingOption
from core.models.sections.user_profile import UserProfile
from core.serializers.reading_serializers import (
    ReadingTestSerializer,
    ReadingBlockSerializer,
    ReadingQuestionSerializer,
    ReadingOptionSerializer
)

class ReadingTestViewSet(viewsets.ModelViewSet):
    queryset = ReadingTest.objects.all()
    serializer_class = ReadingTestSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """
        Filtra los tests por vertical si se proporciona en los parámetros de consulta
        """
        queryset = super().get_queryset()
        vertical = self.request.query_params.get('vertical', None)
        if vertical is not None:
            queryset = queryset.filter(vertical=vertical)
        return queryset

    @action(detail=True, methods=['post'])
    def submit_answers(self, request, pk=None):
        test = self.get_object()
        user_email = request.data.get('user_email')
        answers = request.data.get('answers', {})
        
        if not user_email:
            return Response(
                {'error': 'Se requiere el email del usuario'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_profile = UserProfile.objects.get(email=user_email)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Obtener todas las preguntas del test
        total_questions = 0
        correct_answers = 0

        for block in test.reading_blocks.all():
            for question in block.questions.all():
                total_questions += 1
                selected_option_id = answers.get(str(question.id))
                
                if selected_option_id:
                    try:
                        selected_option = ReadingOption.objects.get(
                            id=selected_option_id,
                            question=question
                        )
                        if selected_option.is_correct:
                            correct_answers += 1
                    except ReadingOption.DoesNotExist:
                        continue

        # Calcular porcentaje
        if total_questions > 0:
            score = (correct_answers / total_questions) * 100
        else:
            score = 0

        # Actualizar el resultado en el perfil del usuario
        user_profile.resultado_reading = score
        user_profile.save()

        return Response({
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'score': score,
            'message': 'Respuestas procesadas correctamente'
        })

class ReadingBlockViewSet(viewsets.ModelViewSet):
    queryset = ReadingBlock.objects.all()
    serializer_class = ReadingBlockSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        test_id = self.request.query_params.get('test_id', None)
        if test_id is not None:
            queryset = queryset.filter(test_id=test_id)
        return queryset

class ReadingQuestionViewSet(viewsets.ModelViewSet):
    queryset = ReadingQuestion.objects.all()
    serializer_class = ReadingQuestionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        block_id = self.request.query_params.get('block_id', None)
        if block_id is not None:
            queryset = queryset.filter(block_id=block_id)
        return queryset

class ReadingOptionViewSet(viewsets.ModelViewSet):
    queryset = ReadingOption.objects.all()
    serializer_class = ReadingOptionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        question_id = self.request.query_params.get('question_id', None)
        if question_id is not None:
            queryset = queryset.filter(question_id=question_id)
        return queryset 