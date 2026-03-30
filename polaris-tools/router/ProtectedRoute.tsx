import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isGuest } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || isGuest) {
    return <Navigate to="/login" replace state={{ returnUrl: location.pathname }} />;
  }

  return children;
};
