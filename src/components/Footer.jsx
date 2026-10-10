import { Link } from 'react-router-dom';
import './Footer.css';

/* global __APP_VERSION__ */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-links">
        <Link to="/terms">Terms</Link>
        <span className="dot">&middot;</span>
        <Link to="/privacy">Privacy</Link>
        <span className="dot">&middot;</span>
        <a href="mailto:themedtimescontactmail@gmail.com">Contact</a>
        <span className="dot">&middot;</span>
        <a href="https://www.instagram.com/the.med.times/" target="_blank" rel="noopener noreferrer">
          @the.med.times
        </a>
      </div>
      <p className="site-footer-credit">TheMedTimes &middot; build {__APP_VERSION__}</p>
    </footer>
  );
}
