from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
import logging

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
        audio_files = request.FILES.getlist('audio')  # Obtener todos los archivos de audio

        logging.info(f"[SPEAKING] Email recibido: {user_email}")
        logging.info(f"[SPEAKING] Archivos recibidos: {[f.name for f in audio_files]}")
        for idx, f in enumerate(audio_files):
            f.seek(0, 2)
            size = f.tell()
            f.seek(0)
            logging.info(f"[SPEAKING] Archivo {idx}: {f.name}, tamaño: {size} bytes, tipo: {getattr(f, 'content_type', 'desconocido')}")

        if not user_email or not audio_files:
            return Response({'error': 'Se requiere email y archivos de audio'}, status=400)

        try:
            user_profile = UserProfile.objects.get(email=user_email)
        except UserProfile.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)

        # Obtener todos los bloques del test
        speaking_blocks = SpeakingBlock.objects.filter(speaking_test=test).order_by('id')
        if not speaking_blocks.exists():
            return Response({'error': 'No se encontraron bloques de speaking'}, status=400)

        # Verificar que tenemos el mismo número de archivos que bloques
        if len(audio_files) != speaking_blocks.count():
            return Response({
                'error': f'Se esperaban {speaking_blocks.count()} archivos de audio, pero se recibieron {len(audio_files)}'
            }, status=400)

        # Evaluar cada archivo de audio con su bloque correspondiente
        total_score = 0
        valid_evaluations = 0
        detailed_reports = []

        for i, (audio_file, block) in enumerate(zip(audio_files, speaking_blocks)):
            try:
                reference_text = block.example
                if not reference_text:
                    reference_text = block.text  # Usar el texto como fallback
                logging.info(f"[SPEAKING] Evaluando bloque {block.id} con texto: {reference_text}")
                evaluation = evaluate_speaking(reference_text, audio_file)
                logging.info(f"[SPEAKING] Resultado evaluación bloque {block.id}: {evaluation}")
                
                final_score = evaluation.get("final_score")
                cefr_level = evaluation.get("cefr_level")
                detailed_report = evaluation.get("detailed_report")

                if final_score is not None:
                    total_score += final_score
                    valid_evaluations += 1
                    detailed_reports.append({
                        'block_id': block.id,
                        'score': final_score,
                        'cefr_level': cefr_level,
                        'report': detailed_report
                    })
                else:
                    detailed_reports.append({
                        'block_id': block.id,
                        'error': 'No se pudo evaluar este bloque'
                    })

            except Exception as e:
                logging.error(f"[SPEAKING] Error al evaluar bloque {block.id}: {str(e)}")
                detailed_reports.append({
                    'block_id': block.id,
                    'error': f'Error al evaluar: {str(e)}'
                })

        # Calcular score promedio de todos los bloques evaluados
        if valid_evaluations > 0:
            average_score = total_score / valid_evaluations
            # Determinar nivel CEFR basado en el score promedio
            if average_score >= 80:
                overall_cefr = 'C1'
            elif average_score >= 70:
                overall_cefr = 'B2'
            elif average_score >= 60:
                overall_cefr = 'B1'
            elif average_score >= 50:
                overall_cefr = 'A2'
            else:
                overall_cefr = 'A1'
        else:
            average_score = 0
            overall_cefr = 'A1'

        # Guardar el score promedio
        user_profile.resultado_speaking = average_score
        user_profile.save()

        return Response({
            "score": average_score,
            "cefr_level": overall_cefr,
            "report": detailed_reports,
            "valid_evaluations": valid_evaluations,
            "total_blocks": len(speaking_blocks),
            "message": f"Evaluación completada con éxito 🎤 - {valid_evaluations}/{len(speaking_blocks)} bloques evaluados"
        })


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
