import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const CONTACT_EMAIL = 'themedtimescontactmail@gmail.com';
const REPORT_HREF =
  `mailto:${CONTACT_EMAIL}` +
  `?subject=${encodeURIComponent('P.I.B. question report')}` +
  `&body=${encodeURIComponent('Section (MOA / ADR / DOC):\n\nQuestion (as shown on the card):\n\nWhat is wrong / what it should say:\n')}`;

/* global __APP_VERSION__ */
export default function Footer() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function showCopied() {
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  // Shares the site link and nothing else. Uses the phone's share sheet when
  // there is one, otherwise copies the link.
  async function handleShare() {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return; // they closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showCopied();
    } catch {
      window.prompt('Copy this link:', url);
    }
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-links">
        <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
        <span className="dot">&middot;</span>
        <a href="https://www.instagram.com/the.med.times/" target="_blank" rel="noopener noreferrer">
          @the.med.times
        </a>
        <span className="dot">&middot;</span>
        <button type="button" className="site-footer-btn" onClick={handleShare}>
          {copied ? 'Link copied' : 'Share'}
        </button>
      </div>
      <div className="site-footer-links">
        <Link to="/terms">Terms</Link>
        <span className="dot">&middot;</span>
        <Link to="/privacy">Privacy</Link>
        <span className="dot">&middot;</span>
        <a href={REPORT_HREF}>Report Question</a>
      </div>
      <p className="site-footer-credit">TheMedTimes &middot; build {__APP_VERSION__}</p>
    </footer>
  );
}
