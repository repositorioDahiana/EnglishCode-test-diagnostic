import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import ObjetivoIcon from '../../assets/iconos/objetivo.png';
import histo from '../../assets/iconos/histograma.png';
import audio from '../../assets/iconos/audio.png';
import reloj from '../../assets/iconos/reloj.png';
import micro from '../../assets/iconos/micro.png';
import read from '../../assets/iconos/read.png';
import writi from '../../assets/iconos/writi.png';
import time from '../../assets/iconos/time.png';
import UserInfoModal from '../modals/UserInfoModal';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL;


export default function Home() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [token, setToken] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  
  const {
    loginWithRedirect,
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently
  } = useAuth0();

  // Obtener token y abrir modal si ya está autenticado
  useEffect(() => {
    const fetchUserFromBackend = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          
          const response = await axios.get(`${API_BASE_URL}/api/users/me/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            }
          });
          const backendUser = response.data;
          setBackendUser(backendUser);
          setToken(token);
  
          // Siempre abrir el modal, ya sea para usuarios existentes o nuevos
          setIsModalOpen(true);
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
        }
      }
    };
    fetchUserFromBackend();
  }, [isAuthenticated]);

  const handleUserSubmit = (userData) => {
    localStorage.setItem('userTestInfo', JSON.stringify(userData));
    setIsModalOpen(false);
    navigate('/test');
  };
  
  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Sistema de Evaluación de Inglés</h2>
      </div>
      <p className="text-gray-300 mb-6">
        Esta evaluación medirá tus habilidades de inglés técnico en cuatro áreas clave.
      </p>

      {/*TODO el contenido va en este bloque */}
      <div className="bg-neutral-950 p-6 rounded-xl shadow-md mb-8">
        {/* Objetivo General */}
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <img src={ObjetivoIcon} alt="Objetivo" className="w-5 h-5" />
          Objetivo General
        </h3>
        <p className="text-gray-300 mb-6">
          Evaluar el nivel de inglés técnico y funcional de nuevos estudiantes de EnglishCode en habilidades clave: <b>Listening, Speaking, Reading y Writing</b>.
        </p>

        {/* Estructura General */}
        <h4 className="text-lg font-semibold mb-3">Estructura General</h4>
        <div className="overflow-x-auto mb-10">
          <table className="min-w-full text-left text-sm">
            <thead className="text-blue-500 border-b border-gray-600">
              <tr>
                <th className="px-4 py-2">Sección</th>
                <th className="px-4 py-2">Habilidad Evaluada</th>
                <th className="px-4 py-2">Tipo de Actividad</th>
                <th className="px-4 py-2">Duración</th>
              </tr>
            </thead>
            <tbody className="text-white">
              <tr className="border-b border-gray-700">
                <td className="px-4 py-2">Listening</td>
                <td className="px-4 py-2">Comprensión auditiva</td>
                <td className="px-4 py-2">Opción múltiple / Verdadero-Falso</td>
                <td className="px-4 py-2">10–15 min</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="px-4 py-2">Speaking</td>
                <td className="px-4 py-2">Producción oral</td>
                <td className="px-4 py-2">Grabación de respuestas a prompts técnicos</td>
                <td className="px-4 py-2">10–15 min</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="px-4 py-2">Reading</td>
                <td className="px-4 py-2">Comprensión lectora</td>
                <td className="px-4 py-2">Rellenar huecos / Opción múltiple / Relación</td>
                <td className="px-4 py-2">10–15 min</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Writing</td>
                <td className="px-4 py-2">Producción escrita</td>
                <td className="px-4 py-2">Redacción de email / respuesta técnica</td>
                <td className="px-4 py-2">20–25 min</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sistema de Evaluación */}
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <img src={histo} alt="Ícono histograma" className="w-5 h-5" />
          Sistema de Evaluación
        </h4>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="border border-neutral-700 rounded-lg p-4">
            <h5 className="text-blue-500 font-semibold mb-2">Principiante</h5>
            <div className="w-full h-2 bg-neutral-700 rounded">
              <div className="h-2 bg-blue-500 w-[40%] rounded"></div>
            </div>
            <p className="text-sm text-gray-400 mt-2">0% – 40%</p>
          </div>

          <div className="border border-neutral-700 rounded-lg p-4">
            <h5 className="text-blue-500 font-semibold mb-2">Intermedio</h5>
            <div className="w-full h-2 bg-neutral-700 rounded">
              <div className="h-2 bg-blue-500 w-[65%] rounded"></div>
            </div>
            <p className="text-sm text-gray-400 mt-2">50% – 75%</p>
          </div>

          <div className="border border-neutral-700 rounded-lg p-4">
            <h5 className="text-blue-500 font-semibold mb-2">Avanzado</h5>
            <div className="w-full h-2 bg-neutral-700 rounded">
              <div className="h-2 bg-blue-500 w-[90%] rounded"></div>
            </div>
            <p className="text-sm text-gray-400 mt-2">80% +</p>
          </div>
        </div>

        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">Fórmula de evaluación:</span>{' '}
          (<span className="text-blue-400">Listening Score</span> + <span className="text-blue-400">Speaking Score</span>) / 2
        </p>
      </div>

      <div className="bg-neutral-950 p-6 rounded-xl shadow-md mb-12">
        <h3 className="text-2xl font-bold mb-6">Módulos de la Evaluación</h3>

        {/* Grid de módulos */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Listening */}
          <div className="border border-neutral-700 rounded-lg p-4">
          <h4 className="text-blue-400 font-semibold mb-1 flex items-center gap-2">
            <img src={audio} alt="Ícono audio" className="w-5 h-5" />
            Listening
          </h4>
            <p className="text-gray-300 text-sm mb-2">
              Escucharás conversaciones técnicas y responderás preguntas sobre ellas.
            </p>
            <p className="text-gray-400 text-xs flex items-center gap-2">
              <img src={reloj} alt="Reloj" className="w-3.5 h-4" />
              10–15 min
            </p>
          </div>

          {/* Speaking */}
          <div className="border border-neutral-700 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-1 flex items-center gap-2">
              <img src={micro} alt="Ícono audio" className="w-4 h-5" />
              Speaking
            </h4>
            <p className="text-gray-300 text-sm mb-2">
              Grabarás respuestas orales a preguntas técnicas y situaciones profesionales.
            </p>
            <p className="text-gray-400 text-xs flex items-center gap-2">
              <img src={reloj} alt="Reloj" className="w-3.5 h-4" />
              10–15 min
            </p>
          </div>

          {/* Reading */}
          <div className="border border-neutral-700 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-1 flex items-center gap-2">
              <img src={read} alt="Ícono audio" className="w-5 h-6" />
              Reading
            </h4>
            <p className="text-gray-300 text-sm mb-2">
              Leerás textos técnicos y responderás preguntas de comprensión.
            </p>
            <p className="text-gray-400 text-xs flex items-center gap-2">
              <img src={reloj} alt="Reloj" className="w-3.5 h-4" />
              10–15 min
            </p>
          </div>

          {/* Writing */}
          <div className="border border-neutral-700 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-1 flex items-center gap-2">
              <img src={writi} alt="Ícono audio" className="w-5 h-5" />
              Writing
            </h4>
            <p className="text-gray-300 text-sm mb-2">
              Escribirás textos técnicos para diferentes situaciones profesionales.
            </p>
            <p className="text-gray-400 text-xs flex items-center gap-2">
              <img src={reloj} alt="Reloj" className="w-3.5 h-4" />
              10–15 min
            </p>
          </div>
        </div>

        {/* Tiempo total */}
        <div className="flex justify-between items-center text-sm text-gray-300 mb-8">
          <div className="flex items-center gap-2">
            <img src={time} alt="Reloj" className="w-5.5 h-6" />
            <span className="font-semibold">Tiempo total estimado:</span>
          </div>
          <span className="text-white font-semibold">50–70 min</span>
        </div>

        {/* Inicio de evaluación */}
        <div className="text-center">
          <div className="flex justify-center mb-2">☑️</div>
          <h4 className="font-semibold text-white mb-1">¿Listo para comenzar?</h4>
          <p className="text-gray-400 text-sm mb-4">
            Una vez iniciada la evaluación, recomendamos completar todas las secciones sin interrupciones.
          </p>
          <button
          onClick={() => {
            if (!isAuthenticated) {
              loginWithRedirect({ redirect_uri: window.location.origin });
            } else {
              setIsModalOpen(true);
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
        >
          {isLoading ? "Cargando..." : "Comenzar Evaluación"}
        </button>
      </div>

        {/* Modal de datos del usuario */}
        {backendUser && (
          <UserInfoModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleUserSubmit}
            userDataFromBackend={{
              email: backendUser.email,
              vertical: backendUser.vertical,
            }}
          />
        )}
      </div>
    </div>
  );
}
