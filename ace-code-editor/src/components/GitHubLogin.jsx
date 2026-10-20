import React, { useEffect, useState } from 'react';
import {
  getToken, setToken, verifyToken, isAuthenticated, getUser,
  oauthAuthorizeUrl, getClientId, setClientId, getOAuthCodeFromUrl, exchangeCodeForToken,
} from '../services/github.js';
import toast from './Toast.jsx';

export default function GitHubLogin({ onClose }) {
  const [tab, setTab] = useState('oauth'); // oauth | token
  const [token, setTok] = useState('');
  const [clientId, setCid] = useState(getClientId());
  const [busy, setBusy] = useState(false);

  // Handle OAuth redirect (?code=...)
  useEffect(() => {
    const code = getOAuthCodeFromUrl();
    if (code && getClientId()) {
      setBusy(true);
      exchangeCodeForToken(code, getClientId())
        .then(async (t) => {
          setToken(t);
          const u = await verifyToken(t);
          toast(`Signed in as ${u.login}`, 'success');
          window.history.replaceState({}, '', window.location.pathname);
          onClose?.();
        })
        .catch((e) => toast('OAuth exchange failed: ' + e.message, 'error'))
        .finally(() => setBusy(false));
    }
  }, []);

  const loginWithToken = async () => {
    if (!token.trim()) return;
    setBusy(true);
    try {
      const u = await verifyToken(token.trim());
      setToken(token.trim());
      toast(`Signed in as ${u.login} 👋`, 'success');
      onClose?.();
    } catch (e) {
      toast('Invalid token: ' + e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const startOAuth = () => {
    if (!clientId.trim()) {
      toast('Enter your GitHub OAuth App Client ID first', 'error');
      return;
    }
    setClientId(clientId.trim());
    window.location.href = oauthAuthorizeUrl(clientId.trim());
  };

  const logout = () => {
    setToken(null);
    toast('GitHub disconnected');
    onClose?.();
  };

  return (
    <div className="modal" style={{ width: 480 }}>
      <div className="modal-header">
        GitHub
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        {isAuthenticated() ? (
          <SignedIn onLogout={logout} onClose={onClose} />
        ) : (
          <>
            <div className="seg" style={{ marginBottom: 14 }}>
              <button className={tab === 'oauth' ? 'on' : ''} onClick={() => setTab('oauth')}>OAuth App</button>
              <button className={tab === 'token' ? 'on' : ''} onClick={() => setTab('token')}>Personal Token</button>
            </div>

            {busy && <p className="dim">Signing in…</p>}

            {tab === 'oauth' ? (
              <>
                <div className="field">
                  <label>OAuth App Client ID</label>
                  <input
                    placeholder="Iv1.xxxxxxxxxxxxxxxx"
                    value={clientId}
                    onChange={(e) => setCid(e.target.value)}
                  />
                </div>
                <p className="dim" style={{ fontSize: 12 }}>
                  Create a GitHub OAuth application at
                  {' '}<a href="https://github.com/settings/applications/new" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>github.com/settings/applications/new</a>{' '}
                  with the callback URL set to this app's address. Then paste the Client ID here and click Sign in.
                </p>
                <button className="btn primary" onClick={startOAuth} disabled={busy}>
                  Sign in with GitHub →
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label>Personal Access Token (needs <code>repo</code>, <code>gist</code>, <code>read:user</code> scopes)</label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setTok(e.target.value)}
                  />
                </div>
                <p className="dim" style={{ fontSize: 12 }}>
                  Create a token at{' '}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                    github.com/settings/tokens
                  </a>. It is stored only in your browser's localStorage.
                </p>
                <button className="btn primary" onClick={loginWithToken} disabled={busy || !token.trim()}>
                  Verify & Sign in
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SignedIn({ onLogout, onClose }) {
  const [user, setUser] = useState(null);
  useEffect(() => { getUser().then(setUser).catch(() => {}); }, []);
  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        {user && <img src={user.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />}
        <div>
          <div style={{ fontWeight: 600 }}>{user?.name || user?.login || 'Connected'}</div>
          <div className="dim" style={{ fontSize: 12 }}>@{user?.login}</div>
        </div>
      </div>
      <div className="row">
        <button className="btn" onClick={onClose}>Done</button>
        <div className="spacer" />
        <button className="btn danger" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
