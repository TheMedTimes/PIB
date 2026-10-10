import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import TopBar from './TopBar';
import { useAuth, NICKNAME_RULES } from '../context/AuthContext';
import './Account.css';

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <label className="account-field">
      {label}
      <div className="account-password-row">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={6}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          className="account-password-toggle"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

export default function Account() {
  const {
    user, profile, loading, recovering,
    signUp, signIn, signOut, createProfile, changeNickname, requestPasswordReset, updatePassword,
  } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  function switchMode(next) {
    setMode(next);
    setErrorMsg(null);
    setMessage(null);
  }

  async function run(fn) {
    setBusy(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setErrorMsg('Something went wrong. Check your connection and try again.');
    }
    setBusy(false);
  }

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    run(async () => {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password, nickname);
        if (result.error) setErrorMsg(result.error.message);
        else if (result.pendingConfirmation) setMessage('Check your email to confirm your account, then come back and sign in.');
        else setMessage('Account created. You are signed in.');
      } else if (mode === 'forgot') {
        const result = await requestPasswordReset(email.trim());
        if (result.error) setErrorMsg(result.error.message);
        else setMessage('If that email has an account, a reset link is on its way. Check your spam folder too.');
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) setErrorMsg(result.error.message);
      }
    });
  };

  const handleNicknameSubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const result = await createProfile(nickname);
      if (result.error) setErrorMsg(result.error.message);
    });
  };

  function startEditingNickname() {
    setNickname(profile.nickname);
    setErrorMsg(null);
    setMessage(null);
    setEditingNickname(true);
  }

  function cancelEditingNickname() {
    setEditingNickname(false);
    setNickname('');
    setErrorMsg(null);
  }

  const handleChangeNickname = (e) => {
    e.preventDefault();
    run(async () => {
      const result = await changeNickname(nickname);
      if (result.error) {
        setErrorMsg(result.error.message);
      } else {
        setEditingNickname(false);
        setNickname('');
        setMessage('Nickname updated. It shows on the leaderboard straight away.');
      }
    });
  };

  const handleNewPassword = (e) => {
    e.preventDefault();
    run(async () => {
      const result = await updatePassword(password);
      if (result.error) setErrorMsg(result.error.message);
      else {
        setPassword('');
        setMessage('Password updated.');
      }
    });
  };

  const shell = (children) => (
    <>
      <TopBar back title="Account" />
      <div className="account-wrap">{children}</div>
    </>
  );

  if (loading) return shell(<p>Loading...</p>);

  // Arrived from a password-reset email link.
  if (recovering) {
    return shell(
      <form className="account-form" onSubmit={handleNewPassword}>
        <p className="account-note">Choose a new password for your account.</p>
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />
        {errorMsg && <p className="account-error">{errorMsg}</p>}
        {message && <p className="account-message">{message}</p>}
        <button type="submit" className="pixel-btn" disabled={busy}>{busy ? 'Working...' : 'Save new password'}</button>
      </form>
    );
  }

  // Signed in but no nickname yet (taken at signup, or account made elsewhere).
  if (user && !profile) {
    return shell(
      <form className="account-form" onSubmit={handleNicknameSubmit}>
        <p className="account-note">Pick a nickname to appear on the leaderboard. Your email is never shown.</p>
        <label className="account-field">
          Nickname
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} required />
        </label>
        <p className="account-note">{NICKNAME_RULES}</p>
        {errorMsg && <p className="account-error">{errorMsg}</p>}
        <button type="submit" className="pixel-btn" disabled={busy}>{busy ? 'Working...' : 'Save nickname'}</button>
        <button type="button" className="pixel-btn coral" onClick={signOut}>Sign out</button>
      </form>
    );
  }

  if (user) {
    return shell(
      <>
        <div className="pixel-panel account-signed-in">
          <p className="account-nickname pixel-text">{profile.nickname}</p>
          <p className="account-email">{user.email}</p>
          {!editingNickname && (
            <div className="account-actions">
              <button className="pixel-btn" onClick={startEditingNickname}>Change nickname</button>
              <button className="pixel-btn coral" onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>

        {editingNickname && (
          <form className="account-form account-edit-nickname" onSubmit={handleChangeNickname}>
            <label className="account-field">
              New nickname
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                autoFocus
                required
              />
            </label>
            <p className="account-note account-note-tight">{NICKNAME_RULES}</p>
            {errorMsg && <p className="account-error">{errorMsg}</p>}
            <button type="submit" className="pixel-btn" disabled={busy}>{busy ? 'Working...' : 'Save nickname'}</button>
            <button type="button" className="account-link-btn" onClick={cancelEditingNickname}>Cancel</button>
          </form>
        )}
        {!editingNickname && message && <p className="account-message account-message-center">{message}</p>}
        <p className="account-note">
          Your times are being saved to the <Link to="/leaderboard">leaderboard</Link>. One attempt per
          section per day counts.
        </p>
        <p className="account-note">
          To delete your account and its data, email <a href="mailto:themedtimescontactmail@gmail.com">themedtimescontactmail@gmail.com</a> from
          the address you signed up with.
        </p>
      </>
    );
  }

  return shell(
    <>
      {mode !== 'forgot' && (
        <div className="account-tabs">
          <button className={`account-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>
            Sign in
          </button>
          <button className={`account-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>
            Sign up
          </button>
        </div>
      )}

      <form className="account-form" onSubmit={handleAuthSubmit}>
        {mode === 'forgot' && <p className="account-note">Enter your email and we will send you a link to reset your password.</p>}

        {mode === 'signup' && (
          <label className="account-field">
            Nickname (shown on the leaderboard)
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} required />
          </label>
        )}
        <label className="account-field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        {mode !== 'forgot' && (
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        )}

        {errorMsg && <p className="account-error">{errorMsg}</p>}
        {message && <p className="account-message">{message}</p>}

        <button type="submit" className="pixel-btn" disabled={busy}>
          {busy ? 'Working...' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
        </button>

        {mode === 'signin' && (
          <button type="button" className="account-link-btn" onClick={() => switchMode('forgot')}>Forgot password?</button>
        )}
        {mode === 'forgot' && (
          <button type="button" className="account-link-btn" onClick={() => switchMode('signin')}>Back to sign in</button>
        )}
      </form>

      {mode === 'signup' && (
        <p className="account-note">
          By creating an account you agree to the <Link to="/terms">Terms</Link> and the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      )}

      <p className="account-note">
        Logging in is optional. Without it you can play for free without your time being recorded.
      </p>
    </>
  );
}
