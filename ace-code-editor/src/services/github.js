// GitHub integration via Octokit REST + OAuth device-style flow using a PAT,
// or the implicit browser flow with a client id (no backend needed).
import { Octokit } from '@octokit/rest';

const TOKEN_KEY = 'ace-editor:gh-token';
const CLIENT_ID_KEY = 'ace-editor:gh-client-id';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getClientId() {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
}
export function setClientId(id) {
  if (id) localStorage.setItem(CLIENT_ID_KEY, id);
  else localStorage.removeItem(CLIENT_ID_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function octokit() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated with GitHub');
  return new Octokit({ auth: token });
}

// ---- Auth helpers -------------------------------------------------------

export async function verifyToken(token) {
  const ok = new Octokit({ auth: token });
  const { data: user } = await ok.users.getAuthenticated();
  return user; // throws on bad token
}

export function oauthAuthorizeUrl(clientId, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo gist read:user',
    state: state || '',
    redirect_uri: window.location.origin + window.location.pathname,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export function getOAuthCodeFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return p.get('code');
}

// Exchange code for token. GitHub doesn't allow CORS on the token endpoint,
// so we route through a public CORS proxy as a best-effort for a pure SPA.
export async function exchangeCodeForToken(code, clientId) {
  const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(
    'https://github.com/login/oauth/access_token'
  ), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, client_id: clientId }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || 'Token exchange failed');
  return data.access_token;
}

// ---- Repo operations ----------------------------------------------------

export async function listRepos({ perPage = 100 } = {}) {
  const o = octokit();
  const { data } = await o.repos.listForAuthenticatedUser({
    per_page: perPage, sort: 'updated', visibility: 'all',
  });
  return data;
}

export async function searchRepos(q) {
  const o = octokit();
  const { data } = await o.search.repos({ q, per_page: 30 });
  return data.items;
}

export async function createRepo(name, isPrivate = false) {
  const o = octokit();
  const { data } = await o.repos.createInOrg({
    org: null, name, private: isPrivate, auto_init: true,
  }).catch(async () => {
    // fallback: create on the user account
    const { data } = await o.repos.createForAuthenticatedUser({
      name, private: isPrivate, auto_init: true,
    });
    return { data };
  });
  return data;
}

export async function fetchRepoFiles(owner, repo, branch) {
  const o = octokit();
  let ref;
  try {
    ref = await o.git.getRef({ owner, repo, ref: `heads/${branch}` });
  } catch {
    const { data: r } = await o.repos.get({ owner, repo });
    branch = r.default_branch;
    ref = await o.git.getRef({ owner, repo, ref: `heads/${branch}` });
  }
  const sha = ref.data.object.sha;
  const { data: tree } = await o.git.getTree({ owner, repo, tree_sha: sha, recursive: 'true' });
  const files = [];
  for (const item of tree.tree) {
    if (item.type !== 'blob') continue;
    if (item.size > 1024 * 1024) continue; // skip >1MB files
    try {
      const { data: blob } = await o.git.getBlob({ owner, repo, file_sha: item.sha });
      files.push({ path: item.path, content: decodeBlob(blob.content), size: item.size });
    } catch {
      files.push({ path: item.path, content: '// ⚠ could not load file contents', size: 0 });
    }
  }
  return { files, branch, sha };
}

function decodeBlob(b64) {
  try {
    const bin = atob(b64.replace(/\n/g, ''));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

// Push all project files to a repo branch using the Trees API (single commit).
export async function pushProject({ owner, repo, branch = 'main', files, message = 'Update from Ace Code Editor', baseSha }) {
  const o = octokit();
  let latestSha;
  try {
    const { data: refData } = await o.git.getRef({ owner, repo, ref: `heads/${branch}` });
    latestSha = refData.object.sha;
  } catch {
    // branch does not exist yet – create it from default branch
    const { data: r } = await o.repos.get({ owner, repo });
    const { data: def } = await o.git.getRef({ owner, repo, ref: `heads/${r.default_branch}` });
    latestSha = def.object.sha;
    await o.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: latestSha })
      .catch(() => {}); // may race / already exist
  }

  const entries = files.map((f) => ({
    path: f.path,
    mode: '100644',
    type: 'blob',
    content: f.content ?? '',
  }));

  const { data: tree } = await o.git.createTree({
    owner, repo, base_tree: latestSha, tree: entries,
  });
  const { data: commit } = await o.git.createCommit({
    owner, repo, message, tree: tree.sha, parents: [latestSha],
  });
  await o.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.sha, force: true });
  return { sha: commit.sha, url: commit.html_url };
}

// Create a repo from scratch with all files in one commit (handles empty repos).
export async function pushToNewRepo({ owner, repoName, isPrivate = false, files, message = 'Initial commit from Ace Code Editor', branch = 'main' }) {
  const o = octokit();
  let repoData;
  try {
    repoData = (await o.repos.createForAuthenticatedUser({
      name: repoName, private: isPrivate, auto_init: false,
    })).data;
  } catch (e) {
    if (e.status === 422) {
      repoData = (await o.repos.get({ owner, repo: repoName })).data;
    } else throw e;
  }

  const treeEntries = files.map((f) => ({
    path: f.path, mode: '100644', type: 'blob', content: f.content ?? '',
  }));
  const { data: tree } = await o.git.createTree({ owner: repoData.owner.login, repo: repoName, tree: treeEntries });
  const { data: commit } = await o.git.createCommit({
    owner: repoData.owner.login, repo: repoName, message, tree: tree.sha, parents: [],
  });
  await o.git.createRef({
    owner: repoData.owner.login, repo: repoName,
    ref: `refs/heads/${branch}`, sha: commit.sha,
  }).catch(async () => {
    await o.git.updateRef({
      owner: repoData.owner.login, repo: repoName,
      ref: `heads/${branch}`, sha: commit.sha,
    });
  });
  return repoData;
}

export async function listBranches(owner, repo) {
  const o = octokit();
  const { data } = await o.repos.listBranches({ owner, repo, per_page: 100 });
  return data.map((b) => b.name);
}

// Publish project files as a (secret by default) Gist.
export async function publishGist({ description, files, isPublic = false }) {
  const o = octokit();
  const gistFiles = {};
  for (const f of files) {
    // gist filenames can't contain slashes – flatten paths
    const name = f.path.replaceAll('/', '__');
    if (f.content.length <= 1_000_000) gistFiles[name] = { content: f.content };
  }
  const { data } = await o.gists.create({ description, public: isPublic, files: gistFiles });
  return data;
}

export async function getUser() {
  const o = octokit();
  const { data } = await o.users.getAuthenticated();
  return data;
}
