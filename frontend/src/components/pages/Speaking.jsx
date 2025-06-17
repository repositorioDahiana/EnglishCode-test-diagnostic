import React, { useState, useEffect } from 'react';
import speaking from '../../assets/iconos/micro.png';

export default function Speaking({ verticalId, onComplete }) {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos
  const [recordings, setRecordings] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    fetchAvailableTests();
  }, [verticalId]);

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
      const response = await fetch(`${API_BASE_URL}/api/speaking/tests/?vertical=${verticalId}`);
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
      const response = await fetch(`${API_BASE_URL}/api/speaking/tests/${testId}/`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo cargar el test');
      }
      const data = await response.json();
      const adaptedData = {
        ...data,
        blocks: data.speaking_blocks.map(block => ({
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

  const startRecording = async (blockId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];

      recorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      recorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      
        // Forzar lectura del blob para Chrome
        await audioBlob.arrayBuffer();
      
        const audioUrl = URL.createObjectURL(audioBlob);
      
        setRecordings(prev => ({
          ...prev,
          [blockId]: {
            blob: audioBlob,
            url: audioUrl
          }
        }));
      });

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      setError('No se pudo acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
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

  const handleSubmitTest = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userTestInfo'));
    if (!userInfo || !userInfo.email) {
      setError('No se encontró información del usuario');
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('user_email', userInfo.email);
  
      for (const [blockId, recording] of Object.entries(recordings)) {
        formData.append('audio', recording.blob, `block_${blockId}.wav`);
      }
  
      const response = await fetch(`${API_BASE_URL}/api/speaking/tests/${testData.id}/submit_answers/`,
        {
          method: 'POST',
          body: formData,
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar respuestas');
      }
  
      const result = await response.json();
  
      // ✅ Guardar puntuación general en userInfo
      const updatedUserInfo = {
        ...userInfo,
        resultado_speaking: result.score
      };
      localStorage.setItem('userTestInfo', JSON.stringify(updatedUserInfo));
  
      // ✅ Guardar feedback detallado para mostrar en FeedbackEnd
      if (result.report) {
        localStorage.setItem('speaking_feedback', JSON.stringify(result.report));
      }
      if (result.cefr_level) {
        localStorage.setItem('speaking_level', result.cefr_level);
      }
  
      alert(`✅ Audio enviado con éxito!`);
  
      // Llamar al manejador de finalización
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
  const recordedBlocks = Object.keys(recordings).length;
  const progressPercent = Math.round((recordedBlocks / totalBlocks) * 100);

  return (
    <div className="bg-neutral-950 p-6 rounded-lg shadow text-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <img src={speaking} alt="Ícono speaking" className="w-5 h-5" />
            <h2 className="text-2xl font-bold">
              {testData.title || 'Evaluación Speaking'}
            </h2>
          </div>
          <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-lg font-mono">
            Tiempo: {formatTime(timeLeft)}
          </div>
        </div>
        <p className="text-gray-300">
          {testData.description || 'Graba tus respuestas siguiendo las instrucciones.'}
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
            {recordedBlocks} de {totalBlocks} grabaciones completadas ({progressPercent}%)
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
              <p className="text-gray-400 italic">{currentBlock.example}</p>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="bg-gray-900/30 p-4 rounded-lg">
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={() => isRecording ? stopRecording() : startRecording(currentBlock.id)}
              className={`px-6 py-3 rounded-full transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRecording ? 'Detener Grabación' : 'Iniciar Grabación'}
            </button>

            {recordings[currentBlock.id]?.url && (
              <div className="w-full">
                <h4 className="text-sm font-semibold mb-2">Tu grabación:</h4>
                <audio
                  src={recordings[currentBlock.id].url}
                  controls
                  className="w-full"
                />
              </div>
            )}
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

        {/* Botón de enviar (solo al final) */}
        {currentBlockIndex === testData.blocks.length - 1 && (
          <div className="pt-6">
            <button
              onClick={handleSubmitTest}
              disabled={Object.keys(recordings).length < testData.blocks.length}
              className={`w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all ${
                Object.keys(recordings).length < testData.blocks.length ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {Object.keys(recordings).length < testData.blocks.length 
                ? 'Graba todas las respuestas antes de enviar' 
                : 'Enviar respuestas'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 