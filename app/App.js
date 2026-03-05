import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initCache } from './src/services/CacheManager';

export default function App() {
  useEffect(() => {
    // Initialize cache database on app launch
    initCache().catch(err => console.log('Cache init error:', err));
  }, []);

  return <AppNavigator />;
}
