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

        # Validaciones adicionales de archivos antes de enviar a Speechace
        for i, audio_file in enumerate(audio_files):
            audio_file.seek(0, 2)
            file_size = audio_file.tell()
            audio_file.seek(0)
            
            if file_size == 0:
                logging.error(f"[SPEAKING] Archivo {i} está vacío")
                return Response({'error': f'El archivo de audio {i+1} está vacío'}, status=400)
            
            if file_size < 1024:  # Menos de 1KB
                logging.warning(f"[SPEAKING] Archivo {i} muy pequeño: {file_size} bytes")
            
            content_type = getattr(audio_file, 'content_type', '')
            if content_type and not any(audio_type in content_type.lower() for audio_type in ['audio', 'wav', 'webm', 'ogg']):
                logging.warning(f"[SPEAKING] Tipo de archivo sospechoso en archivo {i}: {content_type}")

        # Evaluar cada archivo de audio con su bloque correspondiente
        total_score = 0
        valid_evaluations = 0
        detailed_reports = []
        zero_scores_count = 0

        for i, (audio_file, block) in enumerate(zip(audio_files, speaking_blocks)):
            try:
                reference_text = block.example
                if not reference_text:
                    reference_text = block.text  # Usar el texto como fallback
                    
                if not reference_text or len(reference_text.strip()) < 5:
                    logging.warning(f"[SPEAKING] Texto de referencia muy corto para bloque {block.id}: '{reference_text}'")
                
                logging.info(f"[SPEAKING] Evaluando bloque {block.id} con texto: {reference_text}")
                evaluation = evaluate_speaking(reference_text, audio_file)
                logging.info(f"[SPEAKING] Resultado evaluación bloque {block.id}: {evaluation}")
                
                final_score = evaluation.get("final_score")
                cefr_level = evaluation.get("cefr_level")
                detailed_report = evaluation.get("detailed_report")

                if final_score is not None:
                    total_score += final_score
                    valid_evaluations += 1
                    
                    # Detectar scores problemáticos
                    if final_score == 0.0:
                        zero_scores_count += 1
                        logging.warning(f"[SPEAKING] Score 0.0 detectado en bloque {block.id}")
                    
                    detailed_reports.append({
                        'block_id': block.id,
                        'score': final_score,
                        'cefr_level': cefr_level,
                        'report': detailed_report,
                        'reference_text': reference_text[:100] + "..." if len(reference_text) > 100 else reference_text  # Para debug
                    })
                else:
                    logging.error(f"[SPEAKING] Score nulo para bloque {block.id}")
                    detailed_reports.append({
                        'block_id': block.id,
                        'error': 'No se pudo evaluar este bloque - score nulo',
                        'reference_text': reference_text[:100] + "..." if len(reference_text) > 100 else reference_text
                    })

            except Exception as e:
                logging.error(f"[SPEAKING] Error al evaluar bloque {block.id}: {str(e)}")
                detailed_reports.append({
                    'block_id': block.id,
                    'error': f'Error al evaluar: {str(e)}',
                    'reference_text': reference_text[:100] + "..." if len(reference_text) > 100 else reference_text
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

        # Logging adicional para casos problemáticos
        if zero_scores_count > 0:
            logging.warning(f"[SPEAKING] {zero_scores_count} de {valid_evaluations} evaluaciones obtuvieron score 0.0")
        
        if average_score == 0.0:
            logging.error(f"[SPEAKING] Score promedio 0.0 - posible problema sistemático")

        # Guardar el score promedio
        user_profile.resultado_speaking = average_score
        user_profile.save()

        return Response({
            "score": average_score,
            "cefr_level": overall_cefr,
            "report": detailed_reports,
            "valid_evaluations": valid_evaluations,
            "total_blocks": len(speaking_blocks),
            "zero_scores_count": zero_scores_count,  # Para debugging en frontend
            "message": f"Evaluación completada con éxito{valid_evaluations}/{len(speaking_blocks)} bloques evaluados" + 
                      (f" (⚠️ {zero_scores_count} con score 0.0)" if zero_scores_count > 0 else "")
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
