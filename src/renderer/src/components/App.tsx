import React, { useState } from 'react';
import HomeScreen, { AppMode } from './HomeScreen';
import HistoryCompare from './HistoryCompare';
import SchemaCompare from './SchemaCompare';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>('home');

  const handleSelectMode = (mode: AppMode) => {
    setCurrentMode(mode);
  };

  const handleBack = () => {
    setCurrentMode('home');
  };

  switch (currentMode) {
    case 'schema-compare':
      return <SchemaCompare onBack={handleBack} />;
    case 'history-compare':
      return <HistoryCompare onBack={handleBack} />;
    case 'home':
    default:
      return <HomeScreen onSelectMode={handleSelectMode} />;
  }
};

export default App;
