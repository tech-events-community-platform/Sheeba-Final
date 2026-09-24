import React from 'react';
import { Navigate } from 'react-router-dom';

export const EventsPage: React.FC = () => {
  // Sheeba is not an event discovery directory; events are accessed via direct share links
  return <Navigate to="/" replace />;
};
