import requests
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

        response = requests.post(
            settings.API_SPEECH_ACE_URL,
            files=files
        )

        print("✅ Status code de Speechace:", response.status_code)
        print("📦 Contenido:")
        print(response.text)

        response.raise_for_status()
        result = response.json()

        # Navegar dentro de "text_score" para sacar el puntaje principal
        text_score = result.get("text_score", {})
        final_score = text_score.get("speechace_score", {}).get("pronunciation", None)
        cefr_level = text_score.get("cefr_score", {}).get("pronunciation", None)

        return {
            "final_score": final_score,
            "cefr_level": cefr_level,
            "detailed_report": result  # Para frontend
        }

    except requests.exceptions.RequestException as e:
        print("🚨 ERROR AL ENVIAR A SPEECHACE:")
        print(str(e))
        raise RuntimeError(f"Error al llamar a Speechace: {str(e)}")
