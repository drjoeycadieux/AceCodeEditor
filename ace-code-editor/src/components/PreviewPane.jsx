import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useEditorStore } from '../store/store.js';
import { buildPreviewDoc } from '../utils/previewBuilder.js';
import '../styles/PreviewPane.css';

const DEFAULT_SETTINGS = {
  theme: 'one_dark', fontSize: 14, tabSize: 2, useSpaces: true,
  wrapEnabled: false, autoUpdatePreview: true, liveAutocomplete: true,
  showPrintMargin: false,
};

export function useSettings() {
  const stored = useEditorStore((s) => s.settings);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export default function PreviewPane() {
  const files = useStore((s) => (s.activeProject() || {}).files || []);
  const projectName = useStore((s) => (s.activeProject() || {}).name || 'preview');
  const previewOpen = useEditorStore((s) => s.previewOpen);
  const togglePreview = useEditorStore((s) => s.togglePreview);
  const settings = useSettings();

  const [srcDoc, setSrcDoc] = useState('');
  const [runToken, setRunToken] = useState(0); // bump to force reload
  const [autoRefresh, setAutoRefresh] = useState(settings.autoUpdatePreview);
  const [device, setDevice] = useState('desktop');
  const [consoleLogs, setConsoleLogs] = useState([]);
  const iframeRef = useRef(null);
  const debounceRef = useRef(null);

  const doc = useMemo(() => buildPreviewDoc(files), [files]);

  // auto refresh with debounce
  useEffect(() => {
    if (!autoRefresh) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSrcDoc(doc);
      setRunToken((t) => t + 1);
      setConsoleLogs([]);
    }, 700);
    return () => clearTimeout(debounceRef.current);
  }, [doc, autoRefresh]);

  // initial load
  useEffect(() => {
    setSrcDoc(doc);
    setRunToken((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    setSrcDoc(doc);
    setRunToken((t) => t + 1);
    setConsoleLogs([]);
  };

  // listen for messages from iframe console bridge
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.source === 'ace-preview') setConsoleLogs((l) => [...l, e.data]);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // expose a global "run" for keyboard shortcut
  useEffect(() => {
    window.__aceRunPreview = run;
    return () => { delete window.__aceRunPreview; };
  });

  const openInNewTab = () => {
    const blob = new Blob([srcDoc], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  if (!previewOpen) {
    return (
      <div className="preview-collapsed">
        <button className="btn small" onClick={() => togglePreview(true)}>▶ Show Preview</button>
      </div>
    );
  }

  const widths = { desktop: '100%', tablet: '768px', phone: '390px' };

  return (
    <div className="preview-pane">
      <div className="pv-toolbar">
        <button className="btn small primary" onClick={run} title="Run / refresh (Ctrl+Enter)">▶ Run</button>
        <label className="pv-auto">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto
        </label>
        <div className="spacer" />
        <div className="seg">
          {['desktop', 'tablet', 'phone'].map((d) => (
            <button key={d} className={device === d ? 'on' : ''} onClick={() => setDevice(d)} title={d}>
              {d === 'desktop' ? '🖥' : d === 'tablet' ? '▭' : '📱'}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={openInNewTab} title="Open in new tab">⬈</button>
        <button className="icon-btn" onClick={() => togglePreview(false)} title="Hide preview">✕</button>
      </div>

      <div className="pv-frame-wrap">
        <iframe
          key={runToken}
          ref={iframeRef}
          title="Preview"
          sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
          srcDoc={srcDoc}
          style={{ width: widths[device], maxWidth: '100%' }}
          className="pv-frame"
        />
      </div>

      <div className="pv-console">
        <div className="pv-console-header">
          Console <span className="badge">{consoleLogs.length}</span>
          <div className="spacer" />
          <button className="icon-btn" title="Clear" onClick={() => setConsoleLogs([])}>🗑</button>
        </div>
        <div className="pv-console-body">
          {consoleLogs.length === 0 ? (
            <span className="dim">No runtime errors. Output appears here.</span>
          ) : (
            consoleLogs.map((l, i) => <div key={i} className="log-err">✖ Runtime error reported by preview</div>)
          )}
        </div>
      </div>
    </div>
  );
}
