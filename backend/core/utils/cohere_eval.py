import cohere
from django.conf import settings

co = cohere.ClientV2(settings.COHERE_API_KEY)

def evaluate_writing(student_text):
    prompt = f"""
You are an English writing evaluator. Evaluate the following student text based on 4 criteria. 
Return a score from 0 to 100 for each one and a short justification.
Criteria:
1. Clarity and coherence in text structure
2. Correct use of verb tenses
3. Use of technical vocabulary
4. Conciseness and precision of ideas

Student's text:
\"\"\"{student_text}\"\"\"

Return in JSON format:
{{
  "clarity_and_coherence": INT,
  "verb_tenses": INT,
  "technical_vocabulary": INT,
  "conciseness": INT,
  "overall_feedback": "TEXT"
}}
"""

    try:
        response = co.chat(
            model="command-a-03-2025",
            messages=[
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}  # Forzar respuesta en formato JSON
        )

        # ✅ ESTA ES LA CORRECTA
        content = response.message.content[0].text
        print("Respuesta de Cohere:")
        print(content)
        return content

    except Exception as e:
        print("ERROR EN COHERE:", str(e))
        raise RuntimeError(f"Error en llamada a Cohere: {str(e)}")
