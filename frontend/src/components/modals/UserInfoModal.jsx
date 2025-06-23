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
  const { getAccessTokenSilently } = useAuth0();
  const [hasTests, setHasTests] = useState(false);
  const [isCheckingTests, setIsCheckingTests] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState('');

  const email = userDataFromBackend?.email || '';
  const vertical = userDataFromBackend?.vertical_id || selectedVertical;

  const verticalName = VERTICAL_OPTIONS.find(opt => opt.id === parseInt(vertical))?.name || 'Selecciona una vertical';

  useEffect(() => {
    if (vertical && vertical !== selectedVertical) {
      setSelectedVertical(vertical);
      checkTestsAvailability(vertical);
    }
  }, [vertical]);

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
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL;
      const token = await getAccessTokenSilently();
      
      // Crear o actualizar usuario con vertical en una sola operación
      const response = await axios.post(
        `${API_BASE_URL}/api/users/create-with-vertical/`,
        { vertical_id: selectedVertical },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log('Respuesta del servidor:', response.data);
      
      const userDataWithVertical = {
        email,
        vertical: selectedVertical,
        verticalName: VERTICAL_OPTIONS.find(opt => opt.id === parseInt(selectedVertical))?.name
      };
      localStorage.setItem('userTestInfo', JSON.stringify(userDataWithVertical));
      localStorage.removeItem('completedTests');
      onSubmit(userDataWithVertical);
    } catch (error) {
      console.error('Error al crear/actualizar usuario:', error);
      if (error.response) {
        console.error('Respuesta del servidor:', error.response.data);
      }
      alert('Error al guardar la información del usuario. Por favor intenta de nuevo.');
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
                      isCheckingTests || (!hasTests && selectedVertical) || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleContinue}
                    disabled={isCheckingTests || (!hasTests && selectedVertical) || isLoading}
                  >
                    {isLoading ? "Guardando..." : isCheckingTests ? "Verificando..." : "Continuar"}
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
