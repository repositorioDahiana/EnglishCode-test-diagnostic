import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import histo from '../../assets/iconos/histograma.png';
import audio from '../../assets/iconos/audio.png';
import micro from '../../assets/iconos/micro.png';
import read from '../../assets/iconos/read.png';
import writi from '../../assets/iconos/writi.png';
import ObjetivoIcon from '../../assets/iconos/objetivo.png';

export default function FeedbackEnd() {
  const { getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isUpdatingAuth0, setIsUpdatingAuth0] = useState(false);
  const [auth0Updated, setAuth0Updated] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const userInfo = JSON.parse(localStorage.getItem('userTestInfo'));

  useEffect(() => {
    const fetchProfileAndUpdateAuth0 = async () => {
      try {
        // Primero obtener el perfil
        const response = await fetch(`${API_BASE_URL}/api/users/?email=${userInfo.email}`);

        if (!response.ok) {
          throw new Error('No se pudo obtener la información del perfil');
        }

        const data = await response.json();
        if (data.length > 0) {
          const userProfile = data[0];
          setProfile(userProfile);
          
          // Luego actualizar Auth0 con los resultados
          await updateAuth0WithResults(userProfile);
        } else {
          setError('No se encontró el perfil del usuario.');
        }

      } catch (err) {
        setError(err.message);
      }
    };

    const updateAuth0WithResults = async (userProfile) => {
      try {
        setIsUpdatingAuth0(true);
        const token = await getAccessTokenSilently();
        
        // Preparar los resultados del test
        const testResults = {
          listening: userProfile.resultado_listening,
          speaking: userProfile.resultado_speaking,
          reading: userProfile.resultado_reading,
          writing: userProfile.resultado_writing
        };

        console.log('Enviando resultados a Auth0');

        // Llamar al endpoint para actualizar Auth0
        const response = await axios.post(
          `${API_BASE_URL}/api/users/update-test-results/`,
          {
            test_results: testResults,
            nivel: userProfile.nivel
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        );

        console.log('Auth0 actualizado exitosamente:', response.data);
        setAuth0Updated(true);
        
      } catch (error) {
        console.error('Error actualizando Auth0:', error);
        // No mostrar error al usuario, los datos están en BD
        setAuth0Updated(false);
      } finally {
        setIsUpdatingAuth0(false);
      }
    };

    if (userInfo?.email) {
      fetchProfileAndUpdateAuth0();
    } else {
      setError('No hay información del usuario en localStorage.');
    }
  }, [userInfo?.email, API_BASE_URL, getAccessTokenSilently]);

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="animate-pulse">
            {isUpdatingAuth0 ? 'Actualizando resultados en Auth0...' : 'Cargando resultados...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col items-center justify-center">
      <div className="bg-neutral-900 p-8 rounded-3xl shadow-lg max-w-xl w-full text-center">

        <div className="bg-blue-950 border border-blue-500 rounded-full px-6 py-2 inline-block mb-6">
          <h1 className="text-2xl font-bold text-blue-300">Resultados Finales</h1>
        </div>

        {/* Indicador de estado de Auth0 */}
        {isUpdatingAuth0 && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-yellow-500"></div>
              <p className="text-yellow-300">Actualizando perfil...</p>
            </div>
          </div>
        )}

        {auth0Updated && !isUpdatingAuth0 && (
          <div className="bg-blue-950 border border-blue-500 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2">
              <p className="text-green-300">Resultado Almacenado exitosamente</p>
            </div>
          </div>
        )}

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

