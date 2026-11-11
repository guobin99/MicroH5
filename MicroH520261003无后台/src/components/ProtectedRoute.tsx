import React, { useEffect } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isBound } = useApp();
  const [location] = useLocation();

  useEffect(() => {
    if (!isBound) window.sessionStorage.setItem('ylt-redirect-after-bind', location);
  }, [isBound, location]);

  if (!isBound) return <Redirect to="/bind-account" />;
  return <>{children}</>;
}
