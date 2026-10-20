import React, { useState } from 'react';
import JSZip from 'jszip';
import { useStore, useEditorStore } from '../store/store.js';
import toast from './Toast.jsx';

export default function CommandPalette() {
  const open = useEditorStore((s) => s.commandPaletteOpen);
  const setOpen = useEditorStore((s) => s.toggleCommandPalette);
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '8vh' }}
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <Inner onClose={() => setOpen(false)} />
    </div>
  );
}

function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s/g, '');
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length;
}

function Inner({ onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const files = useStore((s) => (s.activeProject() || {}).files || []);
  const projects = useStore((s) => s.projects);

  const commands = buildCommands(files, projects, onClose);

  const filtered = query.trim()
    ? commands.filter((c) => fuzzyMatch(c.label + ' ' + (c.hint || ''), query))
    : commands;

  const list = filtered.slice(0, 14);
  const idx = Math.min(selected, Math.max(0, list.length - 1));

  const run = (cmd) => {
    if (!cmd) return;
    onClose();
    setTimeout(() => cmd.run(), 0);
  };

  return (
    <div className="modal palette">
      <input
        autoFocus
        className="palette-input"
        placeholder="Type a command or file name…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => s + 1); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
          if (e.key === 'Enter') run(list[idx]);
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="palette-list">
        {list.map((c, i) => (
          <div key={c.id + i}
            className={`palette-item ${i === idx ? 'sel' : ''}`}
            onMouseEnter={() => setSelected(i)}
            onClick={() => run(c)}>
            <span className="p-icon">{c.icon}</span>
            <span className="p-label">{c.label}</span>
            <span className="p-hint">{c.hint}</span>
          </div>
        ))}
        {list.length === 0 && <div className="empty-hint">No matching commands</div>}
      </div>
    </div>
  );
}

function buildCommands(files, projects, close) {
  const cmds = [];
  const es = useEditorStore.getState();
  const st = useStore.getState();

  // Files
  for (const f of files) {
    cmds.push({
      id: 'file:' + f.path, icon: '📄', label: f.path, hint: 'Open file',
      run: () => es.openFile(f.path),
    });
  }

  // Projects
  for (const p of projects) {
    cmds.push({
      id: 'proj:' + p.id, icon: '🗂', label: `Switch to: ${p.name}`, hint: 'Project',
      run: () => st.switchProject(p.id),
    });
  }

  const gh = async () => {
    const m = await import('../services/github.js');
    return m.isAuthenticated();
  };

  const actions = [
    { id: 'a-new-file', icon: '✨', label: 'New File', hint: 'Create a file in the current project',
      run: () => promptNewFile() },
    { id: 'a-new-project', icon: '🆕', label: 'New Project', hint: 'Create and switch to a new project',
      run: () => { st.createProject(prompt('Project name', 'My Project') || 'My Project'); toast('Project created', 'success'); } },
    { id: 'a-gh-login', icon: '🔑', label: 'GitHub: Connect / Sign in', hint: 'OAuth or PAT',
      run: () => es.toggleGithub(true) },
    { id: 'a-gh-clone', icon: '⬇', label: 'GitHub: Clone repository…', hint: 'Import a repo as a project',
      run: () => es.toggleGithub(true) },
    { id: 'a-gh-push', icon: '⬆', label: 'GitHub: Push project…', hint: 'Commit & push files',
      run: () => es.toggleGithub(true) },
    { id: 'a-settings', icon: '⚙', label: 'Open Settings', hint: 'Theme, font size, tabs…',
      run: () => es.toggleSettings(true) },
    { id: 'a-run', icon: '▶', label: 'Run / Refresh Preview', hint: 'Ctrl+Enter',
      run: () => window.__aceRunPreview?.() },
    { id: 'a-preview', icon: '👁', label: 'Toggle Preview Pane',
      run: () => es.togglePreview() },
    { id: 'a-undo', icon: '↩', label: 'Undo last file operation', hint: 'File create/delete/rename',
      run: () => st.undo() },
    { id: 'a-redo', icon: '↪', label: 'Redo', run: () => st.redo() },
    { id: 'a-zip', icon: '🗜', label: 'Download project as .zip',
      run: () => downloadZip() },
    { id: 'a-export-html', icon: '📤', label: 'Export single HTML file',
      run: () => exportHtml() },
    { id: 'a-import-files', icon: '📥', label: 'Import files from disk',
      run: () => importFromDisk() },
    { id: 'a-format', icon: '🧹', label: 'Format document (Prettier)', hint: 'For the active file',
      run: () => formatActive() },
  ];
  return [...actions, ...cmds];
}

function promptNewFile() {
  const name = prompt('File name (use / for folders):', 'src/component.js');
  if (name) {
    useStore.getState().createFile(name.replace(/^\/+/, ''));
    useEditorStore.getState().openFile(name.replace(/^\/+/, ''));
  }
}

async function downloadZip() {
  const p = useStore.getState().activeProject();
  if (!p) return;
  const zip = new JSZip();
  for (const f of p.files) zip.file(f.path, f.content);
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.name.replace(/\s+/g, '-')}.zip`;
  a.click();
  toast('ZIP downloaded', 'success');
}

async function exportHtml() {
  const { buildPreviewDoc } = await import('../utils/previewBuilder.js');
  const p = useStore.getState().activeProject();
  if (!p) return;
  const html = buildPreviewDoc(p.files);
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'index.html';
  a.click();
  toast('Exported standalone HTML', 'success');
}

function importFromDisk() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = async () => {
    const st = useStore.getState();
    for (const file of Array.from(input.files || [])) {
      const content = await file.text();
      const path = file.webkitRelativePath || file.name;
      if ((st.activeProject()?.files || []).some((f) => f.path === path)) {
        st.updateFileContent(path, content);
      } else {
        st.createFile(path, content);
      }
    }
    toast(`Imported ${input.files.length} file(s)`, 'success');
  };
  input.click();
}

async function formatActive() {
  const es = useEditorStore.getState();
  const st = useStore.getState();
  const path = es.activePath;
  if (!path) return toast('Open a file first', 'error');
  const file = st.activeProject()?.files.find((f) => f.path === path);
  if (!file) return;
  try {
    const { getFileInfo } = await import('../utils/languages.js');
    const parser = getFileInfo(path).prettier;
    if (!parser) return toast('No formatter available for this file type', 'error');
    const prettier = await import('prettier/standalone');
    const plugins = await Promise.all([
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/html'),
      import('prettier/plugins/postcss'),
      ...(parser === 'typescript' ? [import('prettier/plugins/typescript')] : []),
      ...(parser === 'markdown' ? [import('prettier/plugins/markdown')] : []),
      ...(parser === 'yaml' ? [import('prettier/plugins/yaml')] : []),
    ]);
    const out = await prettier.format(file.content, {
      parser,
      plugins: plugins.map((m) => m.default ?? m),
      tabWidth: es.settings.tabSize ?? 2,
      semi: true,
      singleQuote: false,
    });
    st._pushHistory();
    st.updateFileContent(path, out);
    toast('Formatted ✓', 'success');
  } catch (e) {
    toast('Format failed: ' + e.message, 'error');
  }
}
