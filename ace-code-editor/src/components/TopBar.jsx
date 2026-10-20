import React, { useEffect, useState } from 'react';
import { useStore, useEditorStore } from '../store/store.js';
import { newProject } from '../utils/storage.js';
import toast from './Toast.jsx';
import GitHubModal from './GitHubModal.jsx';
import SettingsModal from './SettingsModal.jsx';
import CommandPalette from './CommandPalette.jsx';
import { isAuthenticated, getUser } from '../services/github.js';
import '../styles/TopBar.css';

export default function TopBar() {
  const projects = useStore((s) => s.projects);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const switchProject = useStore((s) => s.switchProject);
  const createProject = useStore((s) => s.createProject);
  const renameProject = useStore((s) => s.renameProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const toggleCommandPalette = useEditorStore((s) => s.toggleCommandPalette);
  const toggleSettings = useEditorStore((s) => s.toggleSettings);
  const githubPanelOpen = useEditorStore((s) => s.githubPanelOpen);
  const toggleGithub = useEditorStore((s) => s.toggleGithub);
  const previewOpen = useEditorStore((s) => s.previewOpen);
  const togglePreview = useEditorStore((s) => s.togglePreview);

  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isAuthenticated()) {
      getUser().then(setUser).catch(() => {});
    }
  }, [githubPanelOpen]);

  const project = projects.find((p) => p.id === activeProjectId);

  const handleRename = () => {
    if (!project) return;
    const name = prompt('Rename project', project.name);
    if (name) renameProject(project.id, name);
  };

  const handleDelete = () => {
    if (!project) return;
    if (confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      deleteProject(project.id);
      toast('Project deleted');
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="brand" onClick={toggleCommandPalette} title="Open command palette (Ctrl+K)">
          <span className="brand-logo">⌘</span>
          <span className="brand-name">Ace Code Editor</span>
        </div>

        <div className="project-picker">
          <select
            value={activeProjectId || ''}
            onChange={(e) => e.target.value && switchProject(e.target.value)}
            title="Switch project"
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="icon-btn" title="New project" onClick={() => {
            createProject(`Project ${projects.length + 1}`);
            toast('New project created', 'success');
          }}>＋</button>
          <button className="icon-btn" title="Rename project" onClick={handleRename}>✎</button>
          <button className="icon-btn danger" title="Delete project" onClick={handleDelete}>🗑</button>
        </div>

        <div className="spacer" />

        <div className="top-actions">
          <button className="btn small" onClick={toggleCommandPalette}>
            ⌘K <span className="kbd">Ctrl K</span>
          </button>
          <button className="btn small" onClick={() => togglePreview()} >
            {previewOpen ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button className="btn small" onClick={() => toggleSettings(true)}>⚙ Settings</button>
          <button
            className={`btn small ${isAuthenticated() ? 'primary' : ''}`}
            onClick={() => toggleGithub(true)}
          >
            {isAuthenticated() ? (
              user ? (
                <><img src={user.avatar_url} alt="" className="avatar" /> {user.login}</>
              ) : 'GitHub ✓'
            ) : '🔑 Connect GitHub'}
          </button>
        </div>
      </header>
      <GitHubModal />
      <SettingsModal />
      <CommandPalette />
    </>
  );
}
