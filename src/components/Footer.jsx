import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Footer.css';

export default function Footer() {
  const { user, profile } = useAuth();

  return (
    <footer className="site-footer">
      <div className="site-footer-links">
        <Link to="/leaderboard">Leaderboard</Link>
        <span className="dot">&middot;</span>
        <Link to="/account">{user ? (profile?.nickname || 'Account') : 'Login'}</Link>
      </div>
      <div className="site-footer-links">
        <Link to="/terms">Terms</Link>
        <span className="dot">&middot;</span>
        <Link to="/copyright">Copyright</Link>
        <span className="dot">&middot;</span>
        <a href="mailto:themedtimescontactmail@gmail.com">Contact</a>
      </div>
      <p className="site-footer-credit">TheMedTimes</p>
    </footer>
  );
}
