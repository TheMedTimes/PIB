import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PixelGridBg from './components/PixelGridBg';
import Home from './components/Home';
import SectionPage from './components/SectionPage';
import Terms from './components/Terms';
import Copyright from './components/Copyright';
import Footer from './components/Footer';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="scanlines app-shell">
        <PixelGridBg />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:section" element={<SectionPage />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/copyright" element={<Copyright />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
