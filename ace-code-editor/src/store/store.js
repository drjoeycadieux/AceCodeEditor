import { create } from 'zustand';
import {
  loadProjects, saveProjects, getActiveId, setActiveId,
  newProject, defaultFiles, uid,
} from '../utils/storage.js';

const MAX_HISTORY = 60;

function persist(get) {
  saveProjects(get().projects);
}

export const useStore = create((set, get) => ({
  // ---------- projects ----------
  projects: loadProjects(),
  activeProjectId: getActiveId(),

  activeProject() {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId) || null;
  },

  files() {
    const p = get().activeProject();
    return p ? p.files : [];
  },

  ensureProject() {
    const { projects } = get();
    if (get().activeProject()) return;
    const p = projects[0] || newProject('Untitled Project');
    set((s) => ({
      projects: projects[0] ? s.projects : [...s.projects, p],
      activeProjectId: p.id,
    }));
    setActiveId(p.id);
    persist(get);
  },

  createProject(name) {
    const p = newProject(name || 'Untitled Project');
    set((s) => ({ projects: [...s.projects, p], activeProjectId: p.id }));
    setActiveId(p.id);
    persist(get);
    return p;
  },

  deleteProject(id) {
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id);
      const activeProjectId = s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId;
      setActiveId(activeProjectId);
      return { projects, activeProjectId };
    });
    persist(get);
  },

  renameProject(id, name) {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
    }));
    persist(get);
  },

  switchProject(id) {
    set({ activeProjectId: id });
    setActiveId(id);
    get().resetHistory();
  },

  updateProject(id, patch) {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
    }));
    persist(get);
  },

  // Replace an entire project's files (used by GitHub clone / import)
  importProject({ name, files, github }) {
    const p = {
      id: uid(), name, files, createdAt: Date.now(), updatedAt: Date.now(),
      github: github || null,
    };
    set((s) => ({ projects: [...s.projects, p], activeProjectId: p.id }));
    setActiveId(p.id);
    persist(get);
    get().resetHistory();
    return p;
  },

  // ---------- file operations (with undo history) ----------
  history: [],
  future: [],

  _snapshot() {
    const p = get().activeProject();
    return p ? JSON.stringify(p.files) : '[]';
  },

  _pushHistory() {
    const snap = get()._snapshot();
    set((s) => ({ history: [...s.history.slice(-MAX_HISTORY), snap], future: [] }));
  },

  resetHistory() {
    set({ history: [], future: [] });
  },

  undo() {
    const { history } = get();
    if (!history.length) return;
    const prev = history[history.length - 1];
    const current = get()._snapshot();
    const p = get().activeProject();
    if (!p) return;
    set((s) => ({
      history: s.history.slice(0, -1),
      future: [current, ...s.future].slice(0, MAX_HISTORY),
      projects: s.projects.map((x) =>
        x.id === p.id ? { ...x, files: JSON.parse(prev), updatedAt: Date.now() } : x
      ),
    }));
    persist(get);
  },

  redo() {
    const { future } = get();
    if (!future.length) return;
    const next = future[0];
    const current = get()._snapshot();
    const p = get().activeProject();
    if (!p) return;
    set((s) => ({
      future: s.future.slice(1),
      history: [...s.history.slice(-MAX_HISTORY), current],
      projects: s.projects.map((x) =>
        x.id === p.id ? { ...x, files: JSON.parse(next), updatedAt: Date.now() } : x
      ),
    }));
    persist(get);
  },

  createFile(path, content = '') {
    const p = get().activeProject();
    if (!p) return;
    if (p.files.some((f) => f.path === path)) {
      alert(`File already exists: ${path}`);
      return;
    }
    get()._pushHistory();
    get().updateProject(p.id, { files: [...p.files, { path, content }] });
  },

  deleteFile(path) {
    const p = get().activeProject();
    if (!p) return;
    get()._pushHistory();
    get().updateProject(p.id, { files: p.files.filter((f) => f.path !== path) });
  },

  renameFile(oldPath, newPath) {
    const p = get().activeProject();
    if (!p || oldPath === newPath) return;
    if (p.files.some((f) => f.path === newPath)) {
      alert(`File already exists: ${newPath}`);
      return;
    }
    get()._pushHistory();
    get().updateProject(p.id, {
      files: p.files.map((f) => (f.path === oldPath ? { ...f, path: newPath } : f)),
    });
  },

  moveFile(oldPath, newDir) {
    const name = oldPath.split('/').pop();
    const newPath = newDir ? `${newDir}/${name}` : name;
    get().renameFile(oldPath, newPath);
  },

  duplicateFile(path) {
    const p = get().activeProject();
    const f = p?.files.find((x) => x.path === path);
    if (!f) return;
    const idx = path.lastIndexOf('.');
    const base = idx > 0 ? path.slice(0, idx) : path;
    const ext = idx > 0 ? path.slice(idx) : '';
    get().createFile(`${base}-copy${ext}`, f.content);
  },

  updateFileContent(path, content) {
    const p = get().activeProject();
    if (!p) return;
    get().updateProject(p.id, {
      files: p.files.map((f) => (f.path === path ? { ...f, content } : f)),
    });
  },

  downloadAllAsZipTrigger() {}, // placeholder – handled in component with jszip
}));

// ---- editor-level store (tabs, cursor, settings) ----
export const useEditorStore = create((set, get) => ({
  openTabs: [],           // array of paths
  activePath: null,
  cursor: { row: 1, col: 1 },
  selectionRange: null,   // { text }
  searchOpen: false,
  commandPaletteOpen: false,
  settingsOpen: false,
  githubPanelOpen: false,
  consoleOpen: true,
  previewOpen: true,
  sidebarWidth: 240,
  previewWidth: 420,

  settings: JSON.parse(localStorage.getItem('ace-editor:settings') || '{}'),
  // defaults merged at usage site

  setSetting(key, value) {
    const settings = { ...get().settings, [key]: value };
    localStorage.setItem('ace-editor:settings', JSON.stringify(settings));
    set({ settings });
  },

  openFile(path) {
    const { openTabs } = get();
    set({
      activePath: path,
      openTabs: openTabs.includes(path) ? openTabs : [...openTabs, path],
    });
  },

  closeTab(path) {
    const { openTabs, activePath } = get();
    const tabs = openTabs.filter((t) => t !== path);
    let active = activePath;
    if (activePath === path) active = tabs[tabs.length - 1] || null;
    set({ openTabs: tabs, activePath: active });
  },

  setActiveTab(path) {
    set({ activePath: path });
  },

  setCursor(cursor) { set({ cursor }); },
  setSelectionRange(sel) { set({ selectionRange: sel }); },
  toggleSearch(v) { set({ searchOpen: v ?? !get().searchOpen }); },
  toggleCommandPalette(v) { set({ commandPaletteOpen: v ?? !get().commandPaletteOpen }); },
  toggleSettings(v) { set({ settingsOpen: v ?? !get().settingsOpen }); },
  toggleGithub(v) { set({ githubPanelOpen: v ?? !get().githubPanelOpen }); },
  toggleConsole(v) { set({ consoleOpen: v ?? !get().consoleOpen }); },
  togglePreview(v) { set({ previewOpen: v ?? !get().previewOpen }); },
  setSidebarWidth(w) { set({ sidebarWidth: Math.max(150, Math.min(500, w)) }); },
  setPreviewWidth(w) { set({ previewWidth: Math.max(200, w) }); },
}));

export { defaultFiles, uid };
