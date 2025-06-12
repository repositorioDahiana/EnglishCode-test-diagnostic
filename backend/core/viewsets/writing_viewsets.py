from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from core.models.sections.writing import WritingTest, WritingBlock
from core.models.sections.user_profile import UserProfile
from core.serializers.writing_serializers import (
    WritingTestSerializer,
    WritingBlockSerializer
)
from core.utils.cohere_eval import evaluate_writing
import json

class WritingTestViewSet(viewsets.ModelViewSet):
    queryset = WritingTest.objects.all()
    serializer_class = WritingTestSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        vertical = self.request.query_params.get('vertical', None)
        if vertical is not None:
            queryset = queryset.filter(vertical=vertical)
        return queryset

    @action(detail=True, methods=['post'])
    def submit_answers(self, request, pk=None):
        test = self.get_object()
        user_email = request.data.get('user_email')
        texto = request.data.get('texto')

        if not user_email or not texto:
            return Response({'error': 'Se requiere email y texto'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_profile = UserProfile.objects.get(email=user_email)
        except UserProfile.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Llamar a Cohere
            raw_response = evaluate_writing(texto)
            criterios = json.loads(raw_response)

            # Normalizar claves (pueden venir con nombres largos del JSON)
            criterios_normalizados = {
                "clarity": criterios.get("clarity_and_coherence", 0),
                "verb_tenses": criterios.get("verb_tenses", 0),
                "vocabulary": criterios.get("technical_vocabulary", 0),
                "conciseness": criterios.get("conciseness", 0)
            }

            # Calcular promedio
            score = sum(criterios_normalizados.values()) / len(criterios_normalizados)

            # Guardar resultado en el perfil del usuario
            user_profile.resultado_writing = score
            user_profile.save()

            return Response({
                'criterios': criterios_normalizados,
                'score': round(score, 2),
                'feedback': criterios.get("overall_feedback", ""),
                'message': 'Texto evaluado exitosamente por IA (Cohere)'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            traceback.print_exc()  # muestra el error completo en consola
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class WritingBlockViewSet(viewsets.ModelViewSet):
    queryset = WritingBlock.objects.all()
    serializer_class = WritingBlockSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        test_id = self.request.query_params.get('test_id', None)
        if test_id is not None:
            queryset = queryset.filter(writing_test_id=test_id)
        return queryset
