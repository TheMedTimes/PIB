import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PixelGridBg from './components/PixelGridBg';
import Home from './components/Home';
import SectionPage from './components/SectionPage';
import Footer from './components/Footer';
import { AuthProvider } from './context/AuthContext';

// Home and the game screens (SectionPage) are the core, high-traffic path,
// those stay in the main bundle. Everything below is visited far less
// often, so it's only downloaded when someone actually navigates there.
const Terms = lazy(() => import('./components/Terms'));
const Copyright = lazy(() => import('./components/Copyright'));
const Account = lazy(() => import('./components/Account'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="scanlines app-shell">
          <PixelGridBg />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/copyright" element={<Copyright />} />
              <Route path="/account" element={<Account />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/:section" element={<SectionPage />} />
            </Routes>
          </Suspense>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
