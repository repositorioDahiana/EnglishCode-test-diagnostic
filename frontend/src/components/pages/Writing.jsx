import React, { useState, useEffect } from 'react';
import writing from '../../assets/iconos/writi.png';

export default function Writing({ onComplete }) {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900);
  const [answers, setAnswers] = useState({});
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  // Normaliza el texto, eliminando espacios y saltos de línea adicionales
  const normalizeText = (text) => {
    // Elimina los espacios en blanco y líneas vacías
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  };

  // Divide el texto en oraciones usando el punto como delimitador
  const splitTextIntoSentences = (text) => {
    return text.split('.').map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
  };

  // Validación de la respuesta antes de pasar al siguiente bloque
  const validateAnswer = (blockId, answerText) => {
    const currentBlock = testData.blocks[currentBlockIndex];

    console.log('Comparando...');
    console.log('Texto del usuario:', answerText.trim());  // Muestra la respuesta del usuario
    console.log('Texto del ejemplo:', currentBlock.example.trim());  // Muestra el ejemplo

    // Normalizar el texto para hacer una comparación precisa
    const normalizedAnswer = normalizeText(answerText);
    const normalizedExample = normalizeText(currentBlock.example);

    console.log('Texto del usuario (normalizado):', normalizedAnswer);  // Muestra la respuesta normalizada
    console.log('Texto del ejemplo (normalizado):', normalizedExample);  // Muestra el ejemplo normalizado

    // Verificar si la respuesta del usuario contiene alguna oración del ejemplo
    const exampleSentences = splitTextIntoSentences(currentBlock.example);

    for (let sentence of exampleSentences) {
      // Si alguna oración del ejemplo está contenida en la respuesta del usuario
      if (normalizedAnswer.includes(normalizeText(sentence))) {
        alert('⚠️ Tu respuesta no puede contener oraciones del ejemplo proporcionado. Por favor, escribe algo diferente.');
        return false;  // No permite avanzar al siguiente bloque
      }
    }

    // Si pasa la validación, se puede avanzar
    return true;
  };

  useEffect(() => {
    fetchAvailableTests();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (timeLeft === 0 && !hasSubmitted) {
      alert('⏰ El tiempo ha terminado. Tus respuestas se están enviando automáticamente...');
      handleSubmitTest();
      setHasSubmitted(true);
    }
  }, [timeLeft, hasSubmitted]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const fetchAvailableTests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/writing/tests/`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudieron cargar los tests disponibles');
      }
      const tests = await response.json();
      if (tests && tests.length > 0) {
        fetchTestData(tests[0].id);
      } else {
        setError('No hay tests disponibles');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchTestData = async (testId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/writing/tests/${testId}/`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo cargar el test');
      }
      const data = await response.json();
      const adaptedData = {
        ...data,
        blocks: data.writing_blocks.map(block => ({
          id: block.id,
          text: block.text,
          instruction: block.instruction,
          example: block.example
        }))
      };
      setTestData(adaptedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (blockId, value) => {
    setAnswers(prev => ({
      ...prev,
      [blockId]: value
    }));
  };

  const handleNextBlock = () => {
    const currentBlock = testData.blocks[currentBlockIndex];
    const userAnswer = answers[currentBlock.id] || '';

    // Validación antes de pasar al siguiente bloque
    if (!validateAnswer(currentBlock.id, userAnswer)) {
      return; // No avanza si la respuesta es igual al ejemplo o contiene oraciones del ejemplo
    }

    // Si pasa la validación, se puede avanzar
    if (currentBlockIndex < testData.blocks.length - 1) {
      setCurrentBlockIndex(prev => prev + 1);
    }
  };

  const handlePreviousBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userTestInfo'));
    if (!userInfo || !userInfo.email) {
      setError('No se encontró información del usuario');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/writing/tests/${testData.id}/submit_answers/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_email: userInfo.email,
            texto: Object.values(answers).join('\n\n')
          }),
        }
      );
    
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar respuestas');
      }
    
      const result = await response.json();
      const message = `✅ Test completado con éxito!`;
      alert(message);
      localStorage.setItem('writing_criterios', JSON.stringify(result.criterios));

      // Guardar puntuación en localStorage
      const updatedUserInfo = {
        ...userInfo,
        resultado_writing: result.score
      };
      localStorage.setItem('userTestInfo', JSON.stringify(updatedUserInfo));
    
      // ✅ Llamar al manejador externo
      if (typeof onComplete === 'function') {
        onComplete();
      }
    
    } catch (err) {
      console.error(err);
      alert('❌ Error al enviar respuestas: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-neutral-950 p-6 rounded-lg shadow text-white min-h-screen">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-2">Cargando test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-950 p-6 rounded-lg shadow text-white min-h-screen">
        <div className="bg-red-900/50 p-4 rounded-lg">
          <p className="text-red-400">Error: {error}</p>
          <button 
            onClick={fetchAvailableTests}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (!testData || !testData.blocks || testData.blocks.length === 0) {
    return (
      <div className="bg-neutral-950 p-6 rounded-lg shadow text-white min-h-screen">
        <p>No hay contenido disponible para este test.</p>
      </div>
    );
  }

  const currentBlock = testData.blocks[currentBlockIndex];

  // Calcular progreso
  const totalBlocks = testData.blocks.length;
  const answeredBlocks = Object.keys(answers).length;
  const progressPercent = Math.round((answeredBlocks / totalBlocks) * 100);

  return (
    <div className="bg-neutral-950 p-6 rounded-lg shadow text-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <img src={writing} alt="Ícono writing" className="w-5 h-5" />
            <h2 className="text-2xl font-bold">
              {testData.title || 'Evaluación Writing'}
            </h2>
          </div>
          <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-lg font-mono">
            Tiempo: {formatTime(timeLeft)}
          </div>
        </div>
        <p className="text-gray-300">
          {testData.description || 'Escribe tus respuestas siguiendo las instrucciones.'}
        </p>

        {/* Barra de Progreso */}
        <div className="mt-4 mb-6">
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-gray-400 text-sm mt-1 text-right">
            {answeredBlocks} de {totalBlocks} bloques completados ({progressPercent}%)
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePreviousBlock}
          disabled={currentBlockIndex === 0}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentBlockIndex === 0 
              ? 'bg-gray-700 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Anterior
        </button>
        <span className="text-gray-400">
          Bloque {currentBlockIndex + 1} de {testData.blocks.length}
        </span>
        <button
          onClick={handleNextBlock}
          disabled={currentBlockIndex === testData.blocks.length - 1}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentBlockIndex === testData.blocks.length - 1
              ? 'bg-gray-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Siguiente
        </button>
      </div>

      {/* Current Block Content */}
      <div className="space-y-8">
        {/* Text to analyze */}
        <div className="bg-gray-900/50 p-6 rounded-lg">
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 whitespace-pre-wrap">{currentBlock.text}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-900/30 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Instrucciones:</h3>
          <p className="text-gray-300 mb-4">{currentBlock.instruction}</p>
          
          {currentBlock.example && (
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">Ejemplo:</h4>
              <p className="text-gray-400 italic" style={{ userSelect: 'none' }}>{currentBlock.example}</p>
            </div>
          )}
        </div>

        {/* Writing Area */}
        <div className="bg-gray-900/30 p-4 rounded-lg">
          <textarea
            value={answers[currentBlock.id] || ''}
            onChange={(e) => handleAnswerChange(currentBlock.id, e.target.value)}
            placeholder="Escribe tu respuesta aquí..."
            className="w-full h-48 bg-gray-800 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handlePreviousBlock}
            disabled={currentBlockIndex === 0}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentBlockIndex === 0 
                ? 'bg-gray-700 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Anterior
          </button>
          <span className="text-gray-400">
            Bloque {currentBlockIndex + 1} de {testData.blocks.length}
          </span>
          <button
            onClick={handleNextBlock}
            disabled={currentBlockIndex === testData.blocks.length - 1}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentBlockIndex === testData.blocks.length - 1
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Siguiente
          </button>
        </div>

        {/* Botón de enviar (solo al final) */}
        {currentBlockIndex === testData.blocks.length - 1 && (
          <div className="pt-6">
            <button
              onClick={handleSubmitTest}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              Enviar respuestas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}



