import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-neutral-880 text-white py-5 px-7 shadow-md">
      <h1 className="text-2xl font-bold">
        <Link to="/" className="hover:text-blue-400 transition">
          English<span className="text-blue-500">Code</span>
        </Link>
        <span className="ml-0"> Evaluator</span>
      </h1>
      <p className="text-base text-gray-300 mt-1">
        Technical and functional English assessment system
      </p>
    </header>
  );
}

