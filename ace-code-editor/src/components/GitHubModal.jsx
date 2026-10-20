import React, { useEffect, useState } from 'react';
import { useStore, useEditorStore } from '../store/store.js';
import {
  isAuthenticated, listRepos, searchRepos, fetchRepoFiles,
  pushProject, pushToNewRepo, listBranches, publishGist, getUser,
} from '../services/github.js';
import toast from './Toast.jsx';
import GitHubLogin from './GitHubLogin.jsx';

export default function GitHubModal() {
  const open = useEditorStore((s) => s.githubPanelOpen);
  const setOpen = useEditorStore((s) => s.toggleGithub);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <Inner onClose={() => setOpen(false)} />
    </div>
  );
}

function Inner({ onClose }) {
  const [view, setView] = useState('main'); // main | clone | push | gist
  if (!isAuthenticated()) {
    return <GitHubLogin onClose={onClose} />;
  }
  switch (view) {
    case 'clone': return <CloneView onBack={() => setView('main')} onClose={onClose} />;
    case 'push': return <PushView onBack={() => setView('main')} onClose={onClose} />;
    case 'gist': return <GistView onBack={() => setView('main')} onClose={onClose} />;
    default:
      return (
        <div className="modal" style={{ width: 420 }}>
          <div className="modal-header">GitHub Sync <button className="modal-close" onClick={onClose}>✕</button></div>
          <div className="modal-body">
            <p className="dim" style={{ fontSize: 13 }}>Signed in ✓ — choose an action:</p>
            <div style={{ display: 'grid', gap: 10 }}>
              <button className="btn blue" onClick={() => setView('clone')}>⬇ Clone / Import a repository</button>
              <button className="btn primary" onClick={() => setView('push')}>⬆ Push project to a repository</button>
              <button className="btn" onClick={() => setView('gist')}>📄 Publish as Gist</button>
            </div>
          </div>
        </div>
      );
  }
}

// ---------------- Clone ----------------
function CloneView({ onBack, onClose }) {
  const importProject = useStore((s) => s.importProject);
  const [q, setQ] = useState('');
  const [repos, setRepos] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!q.trim()) {
      listRepos().then(setRepos).catch((e) => toast(e.message, 'error'));
    } else {
      const t = setTimeout(() => {
        searchRepos(q).then(setRepos).catch((e) => toast(e.message, 'error'));
      }, 350);
      return () => clearTimeout(t);
    }
  }, [q]);

  const doClone = async (repo, branch) => {
    setBusy(repo.full_name);
    try {
      const { files } = await fetchRepoFiles(repo.owner.login, repo.name, branch || repo.default_branch);
      importProject({
        name: repo.name,
        files: files.map((f) => ({ path: f.path, content: f.content })),
        github: { owner: repo.owner.login, repo: repo.name, branch: branch || repo.default_branch },
      });
      toast(`Cloned ${repo.full_name} (${files.length} files)`, 'success');
      onClose();
    } catch (e) {
      toast('Clone failed: ' + e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="modal" style={{ width: 560 }}>
      <div className="modal-header">
        Clone repository
        <button className="modal-close" onClick={onBack}>✕</button>
      </div>
      <div className="modal-body">
        <input
          autoFocus placeholder="Search GitHub repos… (or leave blank for your repos)"
          style={{ width: '100%', marginBottom: 12 }}
          value={q} onChange={(e) => setQ(e.target.value)}
        />
        <div className="repo-list">
          {repos.map((r) => (
            <div key={r.full_name} className="repo-item">
              <div className="repo-info">
                <b>{r.full_name}</b> {r.private && <span className="badge">private</span>}
                <div className="dim" style={{ fontSize: 12 }}>{r.description || ''}</div>
              </div>
              <button className="btn small blue" disabled={!!busy} onClick={() => doClone(r)}>
                {busy === r.full_name ? 'Cloning…' : 'Clone'}
              </button>
            </div>
          ))}
          {repos.length === 0 && <div className="empty-hint">No repositories found.</div>}
        </div>
      </div>
    </div>
  );
}

// ---------------- Push ----------------
function PushView({ onBack, onClose }) {
  const project = useStore((s) => s.activeProject());
  const updateProject = useStore((s) => s.updateProject);
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [mode, setMode] = useState(project?.github ? 'existing' : 'new');
  const [selected, setSelected] = useState(project?.github?.repo || '');
  const [branch, setBranch] = useState(project?.github?.branch || 'main');
  const [branches, setBranches] = useState([]);
  const [newName, setNewName] = useState((project?.name || 'my-project').toLowerCase().replace(/[^a-z0-9._-]/g, '-'));
  const [isPrivate, setIsPrivate] = useState(false);
  const [message, setMessage] = useState('Update from Ace Code Editor');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUser().then(setUser).catch(() => {});
    listRepos().then(setRepos).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === 'existing' && selected) {
      listBranches(user?.login || '', selected).then((b) => {
        setBranches(b);
        if (!b.includes(branch)) setBranch(b[0] || 'main');
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mode, user]);

  const doPush = async () => {
    if (!project) return;
    setBusy(true);
    try {
      if (mode === 'new') {
        const repo = await pushToNewRepo({
          owner: user.login, repoName: newName, isPrivate,
          files: project.files, branch, message,
        });
        updateProject(project.id, { github: { owner: repo.owner.login, repo: repo.name, branch } });
        toast(`Created & pushed to ${repo.full_name} 🎉`, 'success');
      } else {
        const res = await pushProject({
          owner: user.login, repo: selected, branch, files: project.files, message,
        });
        updateProject(project.id, { github: { owner: user.login, repo: selected, branch } });
        toast(`Pushed commit ${res.sha.slice(0, 7)} ✓`, 'success');
      }
      onClose();
    } catch (e) {
      toast('Push failed: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" style={{ width: 520 }}>
      <div className="modal-header">
        Push “{project?.name}” to GitHub
        <button className="modal-close" onClick={onBack}>✕</button>
      </div>
      <div className="modal-body">
        <div className="seg" style={{ marginBottom: 14 }}>
          <button className={mode === 'existing' ? 'on' : ''} onClick={() => setMode('existing')}>Existing repo</button>
          <button className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}>New repo</button>
        </div>

        {mode === 'existing' ? (
          <>
            <div className="field">
              <label>Repository</label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                <option value="">Select a repository…</option>
                {repos.map((r) => <option key={r.full_name} value={r.name}>{r.full_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Branch</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                {(branches.length ? branches : [branch]).map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>New repository name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <label className="pv-auto" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private
            </label>
            <div className="field">
              <label>Branch</label>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
          </>
        )}

        <div className="field">
          <label>Commit message</label>
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <button className="btn primary" onClick={doPush}
          disabled={busy || !project || (mode === 'existing' && !selected)}>
          {busy ? 'Pushing…' : `⬆ Push ${project?.files.length || 0} files`}
        </button>
      </div>
    </div>
  );
}

// ---------------- Gist ----------------
function GistView({ onBack, onClose }) {
  const project = useStore((s) => s.activeProject());
  const [desc, setDesc] = useState(project?.name || 'Ace Code Editor project');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const doPublish = async () => {
    setBusy(true);
    try {
      const g = await publishGist({ description: desc, files: project.files, isPublic });
      window.open(g.html_url, '_blank');
      toast('Gist published 🎉', 'success');
      onClose();
    } catch (e) {
      toast('Gist failed: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" style={{ width: 460 }}>
      <div className="modal-header">Publish as Gist<button className="modal-close" onClick={onBack}>✕</button></div>
      <div className="modal-body">
        <div className="field">
          <label>Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <label className="pv-auto" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public gist
        </label>
        <div>
          <button className="btn blue" onClick={doPublish} disabled={busy}>
            {busy ? 'Publishing…' : '📄 Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
