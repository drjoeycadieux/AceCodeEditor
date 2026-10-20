import React, { useEffect, useRef, useState } from 'react';
import { useStore, useEditorStore } from '../store/store.js';
import FileTree from './FileTree.jsx';
import EditorPane from './EditorPane.jsx';
import PreviewPane from './PreviewPane.jsx';
import toast from './Toast.jsx';
import '../styles/Workbench.css';

export default function Workbench() {
  const sidebarWidth = useEditorStore((s) => s.sidebarWidth);
  const setSidebarWidth = useEditorStore((s) => s.setSidebarWidth);
  const previewOpen = useEditorStore((s) => s.previewOpen);
  const cursor = useEditorStore((s) => s.cursor);
  const activePath = useEditorStore((s) => s.activePath);
  const project = useStore((s) => s.activeProject());
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod && !e.altKey) return;
      const es = useEditorStore.getState();
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); es.toggleCommandPalette(); }
      else if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); es.toggleCommandPalette(); }
      else if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); setSidebarVisible((v) => !v); }
      else if (mod && e.key === 'Enter') { e.preventDefault(); window.__aceRunPreview?.(); }
      else if (mod && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const term = prompt('Find in all files:');
        if (!term) return;
        const st = useStore.getState();
        const hits = (st.activeProject()?.files || [])
          .map((f) => ({ path: f.path, lines: f.content.split('\n')
            .map((l, i) => (l.toLowerCase().includes(term.toLowerCase()) ? i + 1 : null))
            .filter(Boolean).slice(0, 5) }))
          .filter((h) => h.lines.length);
        if (!hits.length) return toast('No matches', 'error');
        hits.slice(0, 3).forEach((h) => toast(`${h.path}: lines ${h.lines.join(', ')}`));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // resizer drag
  const startDrag = (e) => {
    e.preventDefault();
    const move = (ev) => setSidebarWidth(ev.clientX - 4);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <>
      <div className="workbench">
        {sidebarVisible && (
          <>
            <aside className="wb-sidebar" style={{ width: sidebarWidth }}>
              <FileTree />
            </aside>
            <div className="wb-resizer" onMouseDown={startDrag} />
          </>
        )}
        <main className="wb-editor">
          <EditorPane />
        </main>
        <div className="wb-divider" />
        <aside className={`wb-preview ${previewOpen ? '' : 'collapsed'}`}>
          <PreviewPane />
        </aside>
      </div>

      <footer className="statusbar">
        <button className="sb-item" onClick={() => setSidebarVisible((v) => !v)} title="Toggle Explorer (Ctrl+B)">
          {sidebarVisible ? '⧉' : '⧅'} Explorer
        </button>
        <span className="sb-item">{project ? project.name : 'No project'}</span>
        {project?.github && (
          <span className="sb-item accent">⎇ {project.github.branch} · {project.github.owner}/{project.github.repo}</span>
        )}
        <div className="spacer" />
        {activePath && <span className="sb-item">{activePath}</span>}
        <span className="sb-item">Ln {cursor.row}, Col {cursor.col}</span>
        <span className="sb-item">UTF-8</span>
        <span className="sb-item">Spaces: {useEditorStore.getState().settings.tabSize ?? 2}</span>
      </footer>
    </>
  );
}
