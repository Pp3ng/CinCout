import React, { useEffect } from 'react';
import EditorPanel from './EditorPanel';
import OutputPanel from './OutputPanel';
import { useUIState } from '../context/UIStateContext';

const MainContainer: React.FC = () => {
  const { state, setState } = useUIState();

  // Handle output panel closing
  const handleCloseOutput = () => {
    setState({ isOutputVisible: false });
  };

  // Listen for escape key to close output panel
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.isOutputVisible) {
        handleCloseOutput();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [state.isOutputVisible]);

  return (
    <div className="main-container">
      <EditorPanel isOutputVisible={state.isOutputVisible} />
      <OutputPanel 
        isVisible={state.isOutputVisible}
        onClose={handleCloseOutput}
      />
    </div>
  );
};

export default MainContainer;