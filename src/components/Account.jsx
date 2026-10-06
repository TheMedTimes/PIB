import { useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from './TopBar';
import { useAuth } from '../context/AuthContext';
import './Account.css';

export default function Account() {
  const { user, profile, loading, signUp, signIn, signOut } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setErrorMsg(null);

    if (mode === 'signup') {
      if (nickname.trim().length < 2) {
        setErrorMsg('Nickname needs to be at least 2 characters.');
        setBusy(false);
        return;
      }
      const result = await signUp(email.trim(), password, nickname.trim());
      if (result.error) {
        setErrorMsg(
          result.error.message?.includes('duplicate') || result.error.code === '23505'
            ? 'That nickname is already taken, try another.'
            : result.error.message
        );
      } else if (result.pendingConfirmation) {
        setMessage('Check your email to confirm your account, then come back and sign in.');
      } else {
        setMessage('Account created. You are signed in.');
      }
    } else {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        setErrorMsg(result.error.message);
      }
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <>
        <TopBar back title="Account" />
        <div className="account-wrap">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  if (user) {
    return (
      <>
        <TopBar back title="Account" />
        <div className="account-wrap">
          <div className="pixel-panel account-signed-in">
            <p className="account-nickname pixel-text">{profile?.nickname || 'Player'}</p>
            <p className="account-email">{user.email}</p>
            <button className="pixel-btn coral" onClick={signOut}>Sign out</button>
          </div>
          <p className="account-note">
            Your times are being saved to the <Link to="/leaderboard">leaderboard</Link>. One attempt per
            section per day counts.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar back title="Account" />
      <div className="account-wrap">
        <div className="account-tabs">
          <button
            className={`account-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setErrorMsg(null); setMessage(null); }}
          >
            Sign in
          </button>
          <button
            className={`account-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setErrorMsg(null); setMessage(null); }}
          >
            Sign up
          </button>
        </div>

        <form className="account-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="account-field">
              Nickname (shown on the leaderboard)
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                required
              />
            </label>
          )}
          <label className="account-field">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="account-field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          {errorMsg && <p className="account-error">{errorMsg}</p>}
          {message && <p className="account-message">{message}</p>}

          <button type="submit" className="pixel-btn" disabled={busy}>
            {busy ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="account-note">
          Logging in is optional. Without it you can play freely, just nothing is saved and you will not
          appear on the leaderboard.
        </p>
      </div>
    </>
  );
}
