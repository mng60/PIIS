import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Simple navigation tracker - no external dependencies
export default function NavigationTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page views locally if needed
  }, [location]);

  return null;
}
