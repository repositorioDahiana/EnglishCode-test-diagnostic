import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Listening from './Listening';
import Speaking from './Speaking';
import Reading from './Reading';
import Writing from './Writing';
import audio from '../../assets/iconos/audio.png';
import micro from '../../assets/iconos/micro.png';
import read from '../../assets/iconos/read.png';
import writi from '../../assets/iconos/writi.png';

const Test = () => {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('listening');

  const tabs = [
    { key: 'listening', label: 'Listening', icon: audio },
    { key: 'speaking', label: 'Speaking', icon: micro },
    { key: 'reading', label: 'Reading', icon: read },
    { key: 'writing', label: 'Writing', icon: writi },
  ];

  const [completedTests, setCompletedTests] = useState(() => {
    const stored = localStorage.getItem('completedTests');
    return stored ? JSON.parse(stored) : {};
  });

  // Escuchar cambios de localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = localStorage.getItem('completedTests');
      if (updated) {
        setCompletedTests(JSON.parse(updated));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Redirigir y borrar datos si el usuario cambia de pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert('⚠️ No puedes abandonar el test. Si cambias de pestaña, perderás tus respuestas y tu puntuación será 0.');
        
        // Limpiar todas las respuestas y datos
        localStorage.removeItem('completedTests');
        localStorage.removeItem('listening_responses');
        localStorage.removeItem('reading_responses');
        localStorage.removeItem('speaking_responses');
        localStorage.removeItem('writing_responses');
        localStorage.setItem('test_aborted', 'true');

        // Redirigir al Home
        navigate('/');  // Redirige al Home
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);
  
  // Función que marca módulo como completado y avanza
  const handleModuleCompleted = (moduleKey) => {
    const updated = {
      ...completedTests,
      [moduleKey]: true,
    };
    localStorage.setItem('completedTests', JSON.stringify(updated));
    setCompletedTests(updated);
  
    // Verificar si ya están todos completados
    const allDone = tabs.every(tab => updated[tab.key]);
    if (allDone) {
      navigate('/feedback-end');
    } else {
      // Ir al siguiente módulo pendiente
      const remaining = tabs.find(tab => !updated[tab.key]);
      if (remaining) {
        setActiveTab(remaining.key);
      }
    }
  };

  const renderModule = () => {
    switch (activeTab) {
      case 'listening':
        return <Listening onComplete={() => handleModuleCompleted('listening')} />;
      case 'speaking':
        return <Speaking onComplete={() => handleModuleCompleted('speaking')} />;
      case 'reading':
        return <Reading onComplete={() => handleModuleCompleted('reading')} />;
      case 'writing':
        return <Writing onComplete={() => handleModuleCompleted('writing')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Sistema de Evaluación de Inglés</h1>

        <div className="flex justify-center flex-wrap gap-3 mb-6">
          {tabs.map((tab) => {
            const isCompleted = completedTests[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => !isCompleted && setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border border-blue-800 transition-all text-sm
                  ${activeTab === tab.key ? 'bg-blue-950 text-white' : 'bg-neutral-800 hover:bg-blue-900 text-white'}
                  ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isCompleted}
              >
                <img src={tab.icon} alt={tab.label} className="w-4 h-4" />
                {tab.label}
                {isCompleted && <span className="ml-1 text-green-400">✔</span>}
              </button>
            );
          })}
        </div>

        <hr className="border-gray-700 mb-6" />

        <div className="mt-6">{renderModule()}</div>
      </div>
    </div>
  );
};

export default Test;
