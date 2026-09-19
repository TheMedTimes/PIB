import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-links">
        <Link to="/terms">Terms</Link>
        <span className="dot">•</span>
        <Link to="/copyright">Copyright</Link>
        <span className="dot">•</span>
        <a href="mailto:themedtimescontactmail@gmail.com">Contact</a>
      </div>
      <p className="site-footer-credit">TheMedTimes</p>
    </footer>
  );
}
