// Virtual file system persisted in localStorage.
const PROJECTS_KEY = 'ace-editor:projects';
const ACTIVE_KEY = 'ace-editor:activeProjectId';

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  try {
    // Strip huge files if we hit quota issues later; keep simple here.
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn('Failed to persist projects', e);
  }
}

export function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function makeFileObject(path, content = '') {
  return { path, content };
}

export function newProject(name = 'Untitled Project', files = null) {
  return {
    id: uid(),
    name,
    files: files || defaultFiles(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    github: null, // { owner, repo, branch, sha? } when synced to a repo
  };
}

export function defaultFiles() {
  const now = Date.now();
  const obj = {
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Ace Sandbox</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>`,
    'src/main.js': `import './styles.css';
import { render } from './app.js';

render(document.getElementById('app'));
`,
    'src/app.js': `export function render(el) {
  el.innerHTML = '<h1>Hello from Ace Code Editor 🚀</h1><p>Edit the files and press Run.</p>';
}
`,
    'src/styles.css': `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0d1117;
  color: #e6edf3;
  padding: 2rem;
}
h1 { color: #58a6ff; }
`,
    'README.md': `# My Ace Sandbox

Created with **Ace Code Editor**.

- Edit files on the left
- Press **Run** to preview
- Connect GitHub to push/pull your work
`,
  };
  // convert map -> array of file objects
  return Object.entries(obj).map(([path, content]) => ({ path, content, savedAt: now }));
}
