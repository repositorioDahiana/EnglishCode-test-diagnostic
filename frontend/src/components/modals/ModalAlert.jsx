import React from 'react';

export default function ModalAlert({ isOpen, title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 backdrop-blur-sm bg-white/10" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 shadow-xl text-center">
          <h2 className="text-lg font-medium text-white mb-4">{title}</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}