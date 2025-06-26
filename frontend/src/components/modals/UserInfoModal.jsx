import React, { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// Constantes de vertical basadas en el backend
const VERTICAL_OPTIONS = [
  { id: 1, name: "Quality Assurance Engineers" },
  { id: 2, name: "Cybersecurity" },
  { id: 3, name: "Digital Marketing" },
  { id: 7, name: "UX/UI & Product Management" },
  { id: 8, name: "Sales" },
  { id: 9, name: "Software Engineer" },
  { id: 5, name: "Data & BI" },
  { id: 13, name: "Finanzas y Contaduría" },
  { id: 14, name: "Negocios y Administración" },
  { id: 15, name: "Human Resources" },
];

export default function UserInfoModal({ isOpen, onClose, onSubmit, userDataFromBackend }) {
  const { getAccessTokenSilently, user } = useAuth0();
  const [hasTests, setHasTests] = useState(false);
  const [isCheckingTests, setIsCheckingTests] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState('');
  const [userAttempts, setUserAttempts] = useState(null);
  const [isCheckingAttempts, setIsCheckingAttempts] = useState(false);

  const email = userDataFromBackend?.email || '';
  const vertical = userDataFromBackend?.vertical_id || selectedVertical;

  const verticalName = VERTICAL_OPTIONS.find(opt => opt.id === parseInt(vertical))?.name || 'Selecciona una vertical';

  useEffect(() => {
    if (vertical && vertical !== selectedVertical) {
      setSelectedVertical(vertical);
      checkTestsAvailability(vertical);
    }
  }, [vertical]);

  // Verificar intentos del usuario cuando se abre el modal
  useEffect(() => {
    if (isOpen && email) {
      checkUserAttempts();
    }
  }, [isOpen, email]);

  const checkUserAttempts = async () => {
    setIsCheckingAttempts(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL;
      const token = await getAccessTokenSilently();
      
      const response = await axios.get(`${API_BASE_URL}/api/users/?email=${email}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (response.data.length > 0) {
        const userProfile = response.data[0];
        const fechaDesbloqueo = userProfile.fecha_bloqueo ? 
          new Date(new Date(userProfile.fecha_bloqueo).getTime() + (2 * 24 * 60 * 60 * 1000)) : 
          null;
        
        // Calcular si puede intentar en el frontend
        const puede_intentar = userProfile.intentos_realizados < 3 || 
          (userProfile.fecha_bloqueo && new Date() >= new Date(userProfile.fecha_bloqueo).getTime() + (2 * 24 * 60 * 60 * 1000));
        
        setUserAttempts({
          intentos_realizados: userProfile.intentos_realizados,
          puede_intentar: puede_intentar,
          fecha_bloqueo: userProfile.fecha_bloqueo,
          fecha_desbloqueo: fechaDesbloqueo
        });
      }
    } catch (error) {
      console.error('Error al verificar intentos:', error);
      setUserAttempts(null);
    } finally {
      setIsCheckingAttempts(false);
    }
  };

  const checkTestsAvailability = async (verticalId) => {
    setIsCheckingTests(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL;
      const responses = await Promise.all([
        axios.get(`${API_BASE_URL}/api/listening/tests/`, { params: { vertical: verticalId } }),
        axios.get(`${API_BASE_URL}/api/reading/tests/`, { params: { vertical: verticalId } }),
        axios.get(`${API_BASE_URL}/api/speaking/tests/`, { params: { vertical: verticalId } }),
        axios.get(`${API_BASE_URL}/api/writing/tests/`, { params: { vertical: verticalId } })
      ]);

      const hasAvailableTests = responses.some(r => r.data.length > 0);
      setHasTests(hasAvailableTests);
    } catch (error) {
      console.error("Error al verificar tests disponibles:", error);
      setHasTests(false);
    } finally {
      setIsCheckingTests(false);
    }
  };

  const handleVerticalChange = (e) => {
    const newVertical = e.target.value;
    setSelectedVertical(newVertical);
    if (newVertical) {
      checkTestsAvailability(newVertical);
    } else {
      setHasTests(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedVertical) {
      alert('Por favor selecciona una vertical');
      return;
    }

    setIsLoading(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL;

    try {
      const token = await getAccessTokenSilently();

      // Paso 1: Crear usuario (o actualizar si ya existe)
      const fullName = user?.name || user?.nickname || user?.email;
      const response = await axios.post(
        `${API_BASE_URL}/api/users/create-with-vertical/`,
        {
          vertical_id: selectedVertical,
          name: fullName
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('Respuesta del servidor (creación usuario):', response.data);

      // Paso 2: Registrar intento
      const intentoResponse = await axios.post(
        `${API_BASE_URL}/api/users/register-attempt/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      console.log('Intento registrado:', intentoResponse.data);

      const userDataWithVertical = {
        email,
        vertical: selectedVertical,
        verticalName: VERTICAL_OPTIONS.find(opt => opt.id === parseInt(selectedVertical))?.name,
        fullName,
        intentos_realizados: intentoResponse.data.intentos_realizados
      };

      localStorage.setItem('userTestInfo', JSON.stringify(userDataWithVertical));
      localStorage.removeItem('completedTests');
      onSubmit(userDataWithVertical);

    } catch (error) {
      console.error('Error completo:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);

      // Bloqueo: si viene del backend como 403 por bloqueo
      if (error.response?.status === 403 && error.response.data?.fecha_desbloqueo) {
        const fecha = new Date(error.response.data.fecha_desbloqueo).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        alert(`Has alcanzado el máximo de intentos (3). Tu cuenta está bloqueada hasta el ${fecha}.`);
        onClose(); // Cerrar el modal
      } else if (error.response?.status === 401) {
        alert('Error de autenticación. Por favor inicia sesión nuevamente.');
      } else if (error.response?.status === 404) {
        alert('Endpoint no encontrado. Verifica la configuración del servidor.');
      } else if (error.response?.status === 400) {
        alert(`Error en la solicitud: ${error.response.data?.error || 'Datos inválidos'}`);
      } else if (error.code === 'ERR_NETWORK') {
        alert('Error de conexión. Verifica tu conexión a internet.');
      } else {
        alert(`Error inesperado: ${error.message || 'Error al registrar tu intento o guardar la información. Por favor intenta de nuevo.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 backdrop-blur-sm bg-white/10" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-neutral-900 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium leading-6 text-white mb-4">
                  Información del Usuario
                </Dialog.Title>

                <div className="mb-4">
                  <p className="text-sm text-gray-300">Correo electrónico:</p>
                  <p className="text-white font-semibold">{email}</p>
                </div>

                {/* Información de intentos */}
                {isCheckingAttempts ? (
                  <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-300">Verificando intentos...</p>
                    </div>
                  </div>
                ) : userAttempts && (
                  <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
                    <p className="text-sm text-gray-300 mb-2">Estado de intentos:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">
                        Intentos realizados: {userAttempts.intentos_realizados}/3
                      </span>
                      {userAttempts.intentos_realizados >= 3 ? (
                        <span className="text-red-400 text-sm font-medium">
                          Bloqueado
                        </span>
                      ) : (
                        <span className="text-blue-600 text-sm font-medium">
                          Disponible
                        </span>
                      )}
                    </div>
                    {userAttempts.intentos_realizados >= 3 && userAttempts.fecha_desbloqueo && (
                      <p className="text-xs text-red-300 mt-1">
                        Desbloqueo: {userAttempts.fecha_desbloqueo.toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-sm text-gray-300 mb-2">Vertical:</p>
                  {userDataFromBackend?.exists ? (
                    <p className="text-white font-semibold">{verticalName}</p>
                  ) : (
                    <select
                      value={selectedVertical}
                      onChange={handleVerticalChange}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona una vertical</option>
                      {VERTICAL_OPTIONS.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {!hasTests && !isCheckingTests && selectedVertical && (
                  <p className="text-red-500 text-sm mb-4">No hay tests disponibles para esta vertical.</p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-neutral-800 rounded-md border border-neutral-700 hover:bg-neutral-700"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                      isCheckingTests || (!hasTests && selectedVertical) || isLoading || 
                      (userAttempts && !userAttempts.puede_intentar) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleContinue}
                    disabled={
                      isCheckingTests || 
                      (!hasTests && selectedVertical) || 
                      isLoading || 
                      (userAttempts && !userAttempts.puede_intentar)
                    }
                  >
                    {isLoading ? "Guardando..." : 
                     isCheckingTests ? "Verificando..." : 
                     (userAttempts && !userAttempts.puede_intentar) ? "Bloqueado" : 
                     "Continuar"}
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
