import React, { useEffect } from 'react';
import TopBar from './components/TopBar.jsx';
import Workbench from './components/Workbench.jsx';
import { useStore } from './store/store.js';

export default function App() {
  const ensureProject = useStore((s) => s.ensureProject);

  useEffect(() => {
    ensureProject();
  }, [ensureProject]);

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-main">
        <Workbench />
      </div>
    </div>
  );
}
