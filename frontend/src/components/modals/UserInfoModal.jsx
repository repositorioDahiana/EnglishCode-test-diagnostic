import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import axios from 'axios';

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
  { id: 15, name: "Human Resources" }
];

export default function UserInfoModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [vertical, setVertical] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingTests, setIsCheckingTests] = useState(false);
  const [hasTests, setHasTests] = useState(false);
  const [userStatus, setUserStatus] = useState(''); // 'existing' o 'new'
  
  const checkTestsAvailability = async (verticalId) => {
    setIsCheckingTests(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL;

      const listeningResponse = await axios.get(`${API_BASE_URL}/api/listening/tests/`, { params: { vertical: verticalId } });
      const readingResponse = await axios.get(`${API_BASE_URL}/api/reading/tests/`, { params: { vertical: verticalId } });
      const speakingResponse = await axios.get(`${API_BASE_URL}/api/speaking/tests/`, { params: { vertical: verticalId } });
      const writingResponse = await axios.get(`${API_BASE_URL}/api/writing/tests/`, { params: { vertical: verticalId } });

      const hasAvailableTests =
        listeningResponse.data.length > 0 ||
        readingResponse.data.length > 0 ||
        speakingResponse.data.length > 0 ||
        writingResponse.data.length > 0;

      setHasTests(hasAvailableTests);

      if (!hasAvailableTests) {
        setErrors(prev => ({
          ...prev,
          vertical: 'Lo sentimos, actualmente no hay tests disponibles para esta vertical.'
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.vertical;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error al verificar tests disponibles:', error);
      setErrors(prev => ({
        ...prev,
        vertical: 'Error al verificar tests disponibles. Por favor, intenta nuevamente.'
      }));
      setHasTests(false);
    } finally {
      setIsCheckingTests(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'El email no es válido';
    }
    if (!vertical) {
      newErrors.vertical = 'Debes seleccionar una vertical';
    }
    if (vertical && !hasTests) {
      newErrors.vertical = 'No hay tests disponibles para esta vertical';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkExistingUser = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/`, {
        params: { email }
      });
      
      if (response.data && response.data.length > 0) {
        setUserStatus('existing');
        return response.data[0];
      } else {
        setUserStatus('new');
        return null;
      }
    } catch (error) {
      console.error('Error al verificar usuario:', error);
      setUserStatus('new');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL;

    try {
      // Primero verificamos si el usuario existe
      const existingUser = await checkExistingUser();

      let userData;
      if (existingUser) {
        // Si el usuario existe, actualizamos su vertical si es diferente
        if (parseInt(existingUser.vertical) !== parseInt(vertical)) {
          const updateResponse = await axios.patch(`${API_BASE_URL}/api/users/${existingUser.id}/`, {
            vertical: parseInt(vertical)
          });
          userData = updateResponse.data;
        } else {
          userData = existingUser;
        }
      } else {
        // Si el usuario no existe, lo creamos
        const createResponse = await axios.post(`${API_BASE_URL}/api/users/`, {
          email,
          vertical: parseInt(vertical)
        });
        userData = createResponse.data;
      }

      // Preparamos los datos del usuario con el nombre de la vertical
      const userDataWithVertical = {
        ...userData,
        verticalName: VERTICAL_OPTIONS.find(opt => opt.id === parseInt(userData.vertical))?.name
      };

      // Guardamos en localStorage y limpiamos el estado
      localStorage.setItem('userTestInfo', JSON.stringify(userDataWithVertical));
      localStorage.removeItem('completedTests');
      setEmail('');
      setVertical('');
      setErrors({});
      onSubmit(userDataWithVertical);
    } catch (error) {
      console.error('Error al procesar usuario:', error);
      setErrors({
        submit: 'Error al procesar el usuario. Por favor, intenta nuevamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerticalChange = async (e) => {
    const selectedVertical = e.target.value;
    setVertical(selectedVertical);
    setHasTests(false);

    if (selectedVertical) {
      await checkTestsAvailability(selectedVertical);
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
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white mb-4"
                >
                  Información del Usuario
                </Dialog.Title>

                <div className="mt-4">
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                    {userStatus === 'existing' && (
                      <p className="mt-1 text-sm text-green-500">Usuario existente - Bienvenido de nuevo</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="vertical" className="block text-sm font-medium text-gray-300 mb-2">
                      Vertical
                    </label>
                    <select
                      id="vertical"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={vertical}
                      onChange={handleVerticalChange}
                      disabled={isLoading || isCheckingTests}
                    >
                      <option value="">Selecciona una vertical</option>
                      {VERTICAL_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {isCheckingTests && (
                      <p className="mt-1 text-sm text-blue-400">Verificando tests disponibles...</p>
                    )}
                    {errors.vertical && (
                      <p className="mt-1 text-sm text-red-500">{errors.vertical}</p>
                    )}
                  </div>

                  {errors.submit && (
                    <p className="mb-4 text-sm text-red-500">{errors.submit}</p>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-neutral-800 rounded-md border border-neutral-700 hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      onClick={onClose}
                      disabled={isLoading || isCheckingTests}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isLoading || isCheckingTests || !hasTests ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={handleSubmit}
                      disabled={isLoading || isCheckingTests || !hasTests}
                    >
                      {isLoading ? 'Guardando...' : userStatus === 'existing' ? 'Continuar' : 'Continuar con el test'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
