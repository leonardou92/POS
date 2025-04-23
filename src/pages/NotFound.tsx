import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <AlertTriangle className="h-16 w-16 text-warning-500 mx-auto mb-4" />
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          404
        </h1>
        <p className="mt-2 text-base text-gray-500">Página no encontrada</p>
        <p className="mt-4 text-sm text-gray-600 max-w-xs mx-auto">
          Lo sentimos, no pudimos encontrar la página que estás buscando.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="btn btn-primary inline-flex items-center justify-center"
          >
            <Home className="h-4 w-4 mr-2" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;