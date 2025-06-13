import React, { useState, useEffect } from 'react';
import audio from '../../assets/iconos/audio.png';

export default function Listening({ onComplete }) {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos
  const API_BASE_URL = import.meta.env.VITE_API_URL;

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
      const response = await fetch(`${API_BASE_URL}/api/listening/tests/`);
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
      const response = await fetch(`${API_BASE_URL}/api/listening/tests/${testId}/`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo cargar el test');
      }
      const data = await response.json();
      const adaptedData = {
        ...data,
        blocks: data.blocks.map(block => ({
          id: block.id,
          instructions: block.instructions,
          video_url: block.video_file,
          questions: block.questions.map(question => ({
            id: question.id,
            text: question.question_text,
            type: question.question_type,
            options: question.options.map(option => ({
              id: option.id,
              text: option.option_text,
              is_correct: option.is_correct
            }))
          }))
        }))
      };
      setTestData(adaptedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, optionId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleNextBlock = () => {
    if (currentBlockIndex < testData.blocks.length - 1) {
      setCurrentBlockIndex(prev => prev + 1);
    }
  };

  const handlePreviousBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(prev => prev - 1);
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

  // 🔢 Calcular progreso
  const totalQuestions = testData.blocks.reduce((acc, block) => acc + block.questions.length, 0);
  const answeredQuestions = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round((answeredQuestions / totalQuestions) * 100);

  const handleSubmitTest = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userTestInfo'));
    if (!userInfo || !userInfo.email) {
      setError('No se encontró información del usuario');
      return;
    }
  
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/listening/tests/${testData.id}/submit_answers/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_email: userInfo.email,
            answers: selectedAnswers,
          }),
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar respuestas');
      }
  
      alert('✅ Respuestas enviadas correctamente');
  
      // 🔔 MARCAR COMO COMPLETADO Y REDIRIGIR DESDE `Test.jsx`
      if (typeof onComplete === 'function') {
        onComplete();
      }
  
    } catch (err) {
      console.error(err);
      alert('❌ Error al enviar respuestas: ' + err.message);
    }
  };

  return (
    <div className="bg-neutral-950 p-6 rounded-lg shadow text-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <img src={audio} alt="Ícono audio" className="w-5 h-5" />
            <h2 className="text-2xl font-bold">
              {testData.title || 'Evaluación Listening'}
            </h2>
          </div>
          <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-lg font-mono">
            Tiempo: {formatTime(timeLeft)}
          </div>
        </div>
        <p className="text-gray-300">
          {testData.description || 'Escucha los audios y responde las preguntas correctamente.'}
        </p>
  
        {/* 🔵 Barra de Progreso */}
        <div className="mt-4 mb-6">
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-gray-400 text-sm mt-1 text-right">
            {answeredQuestions} de {totalQuestions} preguntas respondidas ({progressPercent}%)
          </p>
        </div>
      </div>
  
      {/* Video Player */}
      {currentBlock.video_url && (
        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden mb-8">
          <video
            className="w-full h-full"
            controls
            src={currentBlock.video_url}
          >
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
      )}
  
      {/* Questions (Two columns) */}
      <div className="grid grid-cols-2 gap-8">
        {currentBlock.questions.map((question) => (
          <div
            key={question.id}
            className="bg-gray-900/30 p-4 rounded-lg flex flex-col gap-4"
          >
            <p className="text-sm text-white">{question.text}</p>
            <div className="space-y-2">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswerSelect(question.id, option.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-300 ${
                    selectedAnswers[question.id] === option.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
  
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8">
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
  
      {/* Submit Button */}
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
  );
}
