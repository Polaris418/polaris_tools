import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface GuestRouteProps {
  children: React.ReactElement;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isGuest } = useAuth();

  if (!isGuest) {
    return <Navigate to="/" replace />;
  }

  return children;
};
