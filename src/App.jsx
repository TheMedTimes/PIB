import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PixelGridBg from './components/PixelGridBg';
import Home from './components/Home';
import SectionPage from './components/SectionPage';
import Terms from './components/Terms';
import Copyright from './components/Copyright';
import Account from './components/Account';
import Leaderboard from './components/Leaderboard';
import Footer from './components/Footer';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="scanlines app-shell">
          <PixelGridBg />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/copyright" element={<Copyright />} />
            <Route path="/account" element={<Account />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/:section" element={<SectionPage />} />
          </Routes>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
