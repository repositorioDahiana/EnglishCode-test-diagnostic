import requests
import json
from django.conf import settings

def evaluate_speaking(student_text, audio_file):
    try:
        files = {
            "text": (None, student_text),
            "user_audio_file": audio_file
        }

        print("📡 Enviando a Speechace con texto:")
        print(student_text)
        print("🎧 Tipo de archivo:", audio_file.content_type)
        print("📏 Tamaño del archivo:", len(audio_file.read()))
        audio_file.seek(0)  # Resetear el puntero del archivo

        response = requests.post(
            settings.API_SPEECH_ACE_URL,
            files=files,
            timeout=50  # Agregar timeout
        )

        print("✅ Status code de Speechace:", response.status_code)
        print("📦 Contenido:")
        print(response.text)

        response.raise_for_status()
        
        # Intentar parsear JSON
        try:
            result = response.json()
        except json.JSONDecodeError as e:
            print("🚨 Error al parsear JSON de Speechace:")
            print(f"Contenido recibido: {response.text}")
            raise RuntimeError(f"Respuesta inválida de Speechace: {str(e)}")

        # Validar estructura de respuesta
        if not isinstance(result, dict):
            raise RuntimeError("Respuesta de Speechace no es un objeto válido")

        # Navegar dentro de "text_score" para sacar el puntaje principal
        text_score = result.get("text_score", {})
        if not text_score:
            print("⚠️ No se encontró 'text_score' en la respuesta")
            # Intentar buscar en otras ubicaciones posibles
            speechace_score = result.get("speechace_score", {})
            if speechace_score:
                final_score = speechace_score.get("pronunciation", None)
                cefr_level = speechace_score.get("cefr_level", None)
            else:
                final_score = None
                cefr_level = None
        else:
            speechace_score = text_score.get("speechace_score", {})
            final_score = speechace_score.get("pronunciation", None)
            cefr_level = text_score.get("cefr_score", {}).get("pronunciation", None)

        # Logging para debug
        print(f"🎯 Score final: {final_score}")
        print(f"📊 Nivel CEFR: {cefr_level}")

        return {
            "final_score": final_score,
            "cefr_level": cefr_level,
            "detailed_report": result  # Para frontend
        }

    except requests.exceptions.Timeout:
        print("🚨 Timeout al llamar a Speechace")
        raise RuntimeError("Timeout al evaluar con Speechace. Intenta nuevamente.")
    except requests.exceptions.RequestException as e:
        print("🚨 ERROR AL ENVIAR A SPEECHACE:")
        print(str(e))
        raise RuntimeError(f"Error al llamar a Speechace: {str(e)}")
    except Exception as e:
        print("🚨 ERROR INESPERADO:")
        print(str(e))
        raise RuntimeError(f"Error inesperado: {str(e)}")
