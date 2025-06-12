from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from core.models.sections.listening import ListeningTest, ListeningBlock, ListeningQuestion, ListeningOption
from core.models.sections.user_profile import UserProfile
from core.serializers.listening_serializers import (
    ListeningTestSerializer,
    ListeningBlockSerializer,
    ListeningQuestionSerializer,
    ListeningOptionSerializer
)

class ListeningTestViewSet(viewsets.ModelViewSet):
    queryset = ListeningTest.objects.all()
    serializer_class = ListeningTestSerializer
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

    @action(detail=True, methods=['get'])
    def legacy_format(self, request, pk=None):
        """
        Endpoint compatible con el formato anterior para obtener un test específico
        """
        try:
            test = self.get_object()
            response_data = {
                'id': test.id,
                'title': test.title,
                'description': test.description,
                'vertical': test.vertical,
                'blocks': []
            }
            
            for block in test.blocks.all():
                block_data = {
                    "id": block.id,
                    "instructions": block.instructions,
                    "video_url": block.video_file.url if block.video_file else None,
                    "questions": []
                }
                
                for question in block.questions.all():
                    question_data = {
                        "id": question.id,
                        "text": question.question_text,
                        "type": question.question_type,
                        "options": []
                    }
                    
                    for option in question.options.all():
                        question_data["options"].append({
                            "id": option.id,
                            "text": option.option_text,
                            "is_correct": option.is_correct if request.user.is_staff else None
                        })
                        
                    block_data["questions"].append(question_data)
                
                response_data["blocks"].append(block_data)
                
            return Response(response_data)
        except Exception as e:
            return Response(
                {"error": "Server error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

        for block in test.blocks.all():
            for question in block.questions.all():
                total_questions += 1
                selected_option_id = answers.get(str(question.id))
                
                if selected_option_id:
                    try:
                        selected_option = ListeningOption.objects.get(
                            id=selected_option_id,
                            question=question
                        )
                        if selected_option.is_correct:
                            correct_answers += 1
                    except ListeningOption.DoesNotExist:
                        continue

        # Calcular porcentaje
        if total_questions > 0:
            score = (correct_answers / total_questions) * 100
        else:
            score = 0

        # Actualizar el resultado en el perfil del usuario
        user_profile.resultado_listening = score
        user_profile.save()

        return Response({
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'score': score,
            'message': 'Respuestas procesadas correctamente'
        })

    def list(self, request, *args, **kwargs):
        """
        Sobrescribimos el método list para manejar errores de manera consistente
        """
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {"error": "Server error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        """
        Sobrescribimos el método retrieve para manejar errores de manera consistente
        """
        try:
            return super().retrieve(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {"error": "Server error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ListeningBlockViewSet(viewsets.ModelViewSet):
    queryset = ListeningBlock.objects.all()
    serializer_class = ListeningBlockSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        test_id = self.request.query_params.get('test_id', None)
        if test_id is not None:
            queryset = queryset.filter(test_id=test_id)
        return queryset

class ListeningQuestionViewSet(viewsets.ModelViewSet):
    queryset = ListeningQuestion.objects.all()
    serializer_class = ListeningQuestionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        block_id = self.request.query_params.get('block_id', None)
        if block_id is not None:
            queryset = queryset.filter(block_id=block_id)
        return queryset

class ListeningOptionViewSet(viewsets.ModelViewSet):
    queryset = ListeningOption.objects.all()
    serializer_class = ListeningOptionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        question_id = self.request.query_params.get('question_id', None)
        if question_id is not None:
            queryset = queryset.filter(question_id=question_id)
        return queryset 