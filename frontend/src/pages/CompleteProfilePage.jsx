import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { completeUserProfile } from '../services/api';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    
    if (!storedUser && !token) {
      navigate('/');
      return;
    }
    
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.whatsapp) {
        navigate('/');
        return;
      }
      setUser(parsedUser);
    }
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return setError('El número de teléfono es requerido');
    
    setLoading(true);
    setError('');
    
    try {
      let result;
      if (user) {
        result = await completeUserProfile({ userId: user.id, phone_number: phone });
      }
      
      if (result && result.token) {
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('token', result.token);
        navigate('/');
      } else {
        setError('Error al completar el perfil');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)]">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📱</div>
        <h1 className="text-2xl font-bold text-white mb-1">Completa tu Perfil</h1>
        <p className="text-[var(--text-muted)] text-sm">
          Hola <strong className="text-[var(--gold)]">{user.nombre}</strong>, necesitamos tu número de WhatsApp
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-4">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Número de WhatsApp
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Ej: 3012000092"
            required
            className="w-full bg-transparent text-white placeholder-[var(--text-muted)] outline-none text-base"
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            Ingresa sin espacios ni signos. Usaremos +57{phone}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-4 rounded-xl text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
              Guardando...
            </span>
          ) : '✅ Continuar'}
        </button>
      </form>
    </div>
  );
}