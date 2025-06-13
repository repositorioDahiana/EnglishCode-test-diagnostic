import React, { useEffect, useState } from 'react';
import histo from '../../assets/iconos/histograma.png';
import audio from '../../assets/iconos/audio.png';
import micro from '../../assets/iconos/micro.png';
import read from '../../assets/iconos/read.png';
import writi from '../../assets/iconos/writi.png';
import ObjetivoIcon from '../../assets/iconos/objetivo.png';

export default function FeedbackEnd() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const userInfo = JSON.parse(localStorage.getItem('userTestInfo'));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/?email=${userInfo.email}`
        );

        if (!response.ok) {
          throw new Error('No se pudo obtener la información del perfil');
        }

        const data = await response.json();
        if (data.length > 0) {
          setProfile(data[0]);
        } else {
          setError('No se encontró el perfil del usuario.');
        }

      } catch (err) {
        setError(err.message);
      }
    };

    if (userInfo?.email) {
      fetchProfile();
    } else {
      setError('No hay información del usuario en localStorage.');
    }
  }, []);

  if (error) {
    return (
      <div className="text-white min-h-screen flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-white min-h-screen flex items-center justify-center">
        <p className="animate-pulse">Cargando resultados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col items-center justify-center">
      <div className="bg-neutral-900 p-8 rounded-3xl shadow-lg max-w-xl w-full text-center">

        <div className="bg-blue-950 border border-blue-500 rounded-full px-6 py-2 inline-block mb-6">
          <h1 className="text-2xl font-bold text-blue-300">Resultados Finales</h1>
        </div>

        <p className="text-gray-300 mb-2">
          Email: <span className="text-white font-semibold">{profile.email}</span>
        </p>
        <p className="text-gray-300 mb-6">
          Vertical: <span className="text-white font-semibold">{profile.vertical_display}</span>
        </p>

        <div className="my-6 text-left space-y-3">
          <div className="flex items-center gap-2">
            <img src={audio} alt="Listening" className="w-5 h-5" />
            <p><strong>Listening:</strong> {profile.resultado_listening?.toFixed(2)}%</p>
          </div>
          <div className="flex items-center gap-2">
            <img src={micro} alt="Speaking" className="w-5 h-5" />
            <p><strong>Speaking:</strong> {profile.resultado_speaking?.toFixed(2)}%</p>
          </div>
          <div className="flex items-center gap-2">
            <img src={read} alt="Reading" className="w-5 h-5" />
            <p><strong>Reading:</strong> {profile.resultado_reading?.toFixed(2)}%</p>
          </div>
          <div className="flex items-center gap-2">
            <img src={writi} alt="Writing" className="w-5 h-5" />
            <p><strong>Writing:</strong> {profile.resultado_writing?.toFixed(2)}%</p>
          </div>
        </div>

        <div className="bg-blue-950/40 p-4 rounded-3xl mt-6 flex items-center gap-3 justify-center">
          <img src={histo} alt="Histograma" className="w-6 h-6" />
          <div>
            <p className="text-xl font-semibold">Resultado General:</p>
            <p className="text-2xl font-bold text-blue-400">
              {profile.resultado_general?.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="bg-blue-800/40 p-4 rounded-3xl mt-4 flex items-center gap-3 justify-center">
          <img src={ObjetivoIcon} alt="Objetivo" className="w-6 h-6" />
          <div>
            <p className="text-xl font-semibold">Nivel Asignado:</p>
            <p className="text-2xl font-bold text-blue-300">
              {profile.nivel_display}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-400 mt-6">
          Última actualización: {new Date(profile.fecha_actualizacion).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

