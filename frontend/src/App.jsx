import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ClientView from './pages/ClientView';
import BarberView from './pages/BarberView';
import RegisterPage from './pages/RegisterPage';
import CompleteProfilePage from './pages/CompleteProfilePage';

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
        isActive
          ? 'bg-[var(--gold)] text-[#0A0A0A] shadow-md'
          : 'text-[#888] hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen pb-10">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="text-2xl">💈</span>
            <h1 className="section-title text-xl font-bold tracking-tight" style={{ 
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              Jimmy Barber
            </h1>
          </Link>
          <nav className="flex gap-1.5">
            <NavLink to="/">Reservar</NavLink>
            <NavLink to="/barber">Staff</NavLink>
          </nav>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="max-w-2xl mx-auto px-4 py-4 sm:py-8">
        <Routes>
          <Route path="/" element={<ClientView />} />
          <Route path="/barber" element={<BarberView />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
