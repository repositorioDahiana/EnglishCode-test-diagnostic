import React, { useState, useEffect } from 'react';
import speaking from '../../assets/iconos/micro.png';
import ModalAlert from '../modals/ModalAlert';

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
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const MIN_AUDIO_DURATION_SECONDS = 1; // Duración mínima en segundos para aceptar el audio

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
  const [showRetryModal, setShowRetryModal] = useState(false);


  useEffect(() => {
    if (timeLeft === 0 && !hasSubmitted) {
      showModalAlert('⏰ El tiempo ha terminado. Tus respuestas se están enviando automáticamente...');
      handleSubmitTest();
      setHasSubmitted(true);
    }
  }, [timeLeft, hasSubmitted]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const showModalAlert = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (modalTitle.includes('✅') && typeof onComplete === 'function') {
      onComplete();
    }
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
    // Verificar si el navegador soporta grabación de audio
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('El navegador no soporta grabación de audio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];
      let startTime = null;
      
      recorder.addEventListener('start', () => {
        startTime = Date.now();
      });

      recorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      recorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await audioBlob.arrayBuffer();
        const audioUrl = URL.createObjectURL(audioBlob);
        // Validar duración mínima del audio
        const audio = new Audio(audioUrl);
        audio.addEventListener('loadedmetadata', () => {
          const duration = audio.duration;
          if (duration < MIN_AUDIO_DURATION_SECONDS) {
            setError('El audio es demasiado corto. Por favor, graba al menos 1 segundo.');
            return;
          }
          setRecordings(prev => ({
            ...prev,
            [blockId]: {
              blob: audioBlob,
              url: audioUrl
            }
          }));
        });
      });

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      // Gestionar errores de permisos
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Por favor, concede permiso para usar el micrófono.');
      } else {
        setError('No se pudo acceder al micrófono por un error desconocido.');
      }
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
  
    // Verificar que hay grabaciones para todos los bloques
    const recordingEntries = Object.entries(recordings);
    if (recordingEntries.length === 0) {
      setError('No hay grabaciones para enviar');
      return;
    }
  
    // Verificar que tenemos grabaciones para todos los bloques
    if (recordingEntries.length < testData.blocks.length) {
      setError(`Faltan grabaciones. Tienes ${recordingEntries.length} de ${testData.blocks.length} bloques grabados.`);
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('user_email', userInfo.email);
  
      // Enviar todos los archivos de audio, uno por cada bloque
      for (const [blockId, recording] of recordingEntries) {
        console.log('[SPEAKING] Enviando audio para bloque', blockId, 'Tamaño:', recording.blob.size, 'Tipo:', recording.blob.type);
        formData.append('audio', recording.blob, `block_${blockId}.wav`);
      }
  
      const response = await fetch(`${API_BASE_URL}/api/speaking/tests/${testData.id}/submit_answers/`, {
        method: 'POST',
        body: formData,
      });
  
      // Validar respuesta del servidor
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar respuestas');
      }
  
      const result = await response.json();
      console.log('[SPEAKING] Respuesta del backend:', result);
  
      const updatedUserInfo = {
        ...userInfo,
        resultado_speaking: result.score
      };
      localStorage.setItem('userTestInfo', JSON.stringify(updatedUserInfo));
  
      if (result.report) {
        localStorage.setItem('speaking_feedback', JSON.stringify(result.report));
      }
      if (result.cefr_level) {
        localStorage.setItem('speaking_level', result.cefr_level);
      }
  
      if (result.score === 0.0) {
        console.warn('[SPEAKING] Score recibido 0.0, posible problema de audio o evaluación.');
        setShowRetryModal(true);
      } else {
        showModalAlert('✅ Audio enviado con éxito!', 'Tus grabaciones han sido enviadas correctamente. Haz clic en "Cerrar" para continuar con la siguiente prueba.');
      }
    } catch (err) {
      console.error(err);
      showModalAlert('❌ Error al enviar respuestas', `No se pudieron enviar las grabaciones: ${err.message}. Puedes intentar grabar nuevamente y volver a enviar.`);
    }
  };
  

  if (loading) {
    return (
      <div className="bg-neutral-950 p-6 rounded-lg shadow text-white min-h-screen">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-2">Loading test...</p>
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
            Try again
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
          <div className="text-sm text-black bg-white px-3 py-1 rounded-lg font-mono shadow">
            Time: {formatTime(timeLeft)}
          </div>
        </div>
        <p className="text-gray-300">
          {testData.description || 'Graba tus respuestas siguiendo las instrucciones.'}
        </p>

        {/* Barra de Progreso */}
        <div className="mt-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Progress</h3>
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-gray-400 text-sm mt-1 text-right">
            {recordedBlocks} of {totalBlocks} recordings completed ({progressPercent}%)
          </p>
        </div>
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
          <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
          <p className="text-gray-300 mb-4">{currentBlock.instruction}</p>
          
          {currentBlock.example && (
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">Example:</h4>
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
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>

            {recordings[currentBlock.id]?.url && (
              <div className="w-full">
                <h4 className="text-sm font-semibold mb-2">Your recording:</h4>
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
            Former
          </button>
          <span className="text-gray-400">
            Block {currentBlockIndex + 1} of {testData.blocks.length}
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
            Following
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
                ? 'Record all answers before submitting' 
                : 'Submit responses'}
            </button>
          </div>
        )}
      </div>
      {showRetryModal && (
        <div className="fixed inset-0 z-50">
          {/* Fondo difuminado */}
          <div className="fixed inset-0 backdrop-blur-sm bg-white/10" />

          {/* Contenedor modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 shadow-xl text-center text-white">
              <h2 className="text-lg font-medium text-red-400 mb-4">⚠️ Audio de baja calidad</h2>
              <p className="text-gray-300 text-sm mb-4">
                Tu calificación fue <strong className="text-white">0.0</strong>. Esto puede deberse a que tu voz no se escuchó bien.
                Te recomendamos:
              </p>
              <ul className="text-left text-sm text-gray-400 list-disc list-inside mb-4">
                <li>Grabar más cerca del micrófono</li>
                <li>Usar tu celular si estás desde un PC</li>
                <li>Evitar ruido de fondo</li>
              </ul>
              <p className="text-gray-300 text-sm mb-6">¿Deseas volver a grabar o continuar de todos modos?</p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowRetryModal(false);
                    setRecordings({});
                    setCurrentBlockIndex(0);
                    setTimeLeft(900);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Volver a grabar
                </button>
                <button
                  onClick={() => {
                    setShowRetryModal(false);
                    showModalAlert(
                      '✅ Audio enviado con éxito!',
                      'Tus grabaciones han sido enviadas correctamente. Haz clic en "Cerrar" para continuar con la siguiente prueba.'
                    );
                  }}
                  className="px-4 py-2 bg-neutral-700 text-white rounded-md hover:bg-neutral-600 transition"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalAlert
        isOpen={showModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleModalClose}
      />
    </div>
  );
} 