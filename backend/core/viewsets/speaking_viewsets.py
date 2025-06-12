from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from core.models.sections.speaking import SpeakingTest, SpeakingBlock
from core.models.sections.user_profile import UserProfile
from core.serializers.speaking_serializers import (
    SpeakingTestSerializer,
    SpeakingBlockSerializer
)

from core.utils.speechace_eval import evaluate_speaking


class SpeakingTestViewSet(viewsets.ModelViewSet):
    queryset = SpeakingTest.objects.all()
    serializer_class = SpeakingTestSerializer
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
        audio_file = request.FILES.get('audio')

        if not user_email or not audio_file:
            return Response({'error': 'Se requiere email y audio'}, status=400)

        try:
            user_profile = UserProfile.objects.get(email=user_email)
        except UserProfile.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)

        speaking_block = SpeakingBlock.objects.filter(speaking_test=test).first()
        if not speaking_block:
            return Response({'error': 'No se encontró bloque de speaking'}, status=400)

        reference_text = speaking_block.example

        try:
            evaluation = evaluate_speaking(reference_text, audio_file)

            final_score = evaluation.get("final_score")
            cefr_level = evaluation.get("cefr_level")
            detailed_report = evaluation.get("detailed_report")

            if final_score is None:
                return Response(
                    {"error": "No se recibió puntuación de pronunciación"},
                    status=500
                )

            # Guardar solo el score promedio
            user_profile.resultado_speaking = final_score
            user_profile.save()

            return Response({
                "score": final_score,
                "cefr_level": cefr_level,
                "report": detailed_report,  # se puede usar para retroalimentación detallada
                "message": "Evaluación completada con éxito 🎤"
            })

        except Exception as e:
            return Response({
                "error": f"Error al evaluar con Speechace: {str(e)}"
            }, status=500)


class SpeakingBlockViewSet(viewsets.ModelViewSet):
    queryset = SpeakingBlock.objects.all()
    serializer_class = SpeakingBlockSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        test_id = self.request.query_params.get('test_id', None)
        if test_id is not None:
            queryset = queryset.filter(speaking_test_id=test_id)
        return queryset
