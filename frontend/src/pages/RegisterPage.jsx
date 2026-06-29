import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { validateToken, completeRegistration } from '../services/api';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [step, setStep] = useState('validating'); // validating | form | success | error
  const [inviteData, setInviteData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [form, setForm] = useState({ nombre: '', whatsapp: '' });

  useEffect(() => {
    if (!token) {
      setStep('error');
      setErrorMsg('Enlace inválido. No se encontró el token de invitación.');
      return;
    }
    validateToken(token)
      .then(data => {
        if (data.valid) {
          setInviteData(data);
          setForm(f => ({ ...f, nombre: data.nombre || '' }));
          setStep('form');
        } else {
          setStep('error');
          setErrorMsg(data.error || 'Token inválido.');
        }
      })
      .catch(() => {
        setStep('error');
        setErrorMsg('No se pudo validar el enlace. Intenta de nuevo.');
      });
  }, [token]);

  const handlePinKey = (digit) => {
    if (pin.length < 6) setPin(p => p + digit);
  };

  const handlePinDelete = () => setPin(p => p.slice(0, -1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setErrorMsg('El nombre es requerido.');
    if (pin.length < 4) return setErrorMsg('El PIN debe tener al menos 4 dígitos.');
    setErrorMsg('');
    setLoading(true);
    try {
      const result = await completeRegistration({ token, nombre: form.nombre, pin, whatsapp: form.whatsapp });
      if (result.success) {
        setStep('success');
      } else {
        setErrorMsg(result.error || 'Error al completar el registro.');
      }
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── VALIDATING ────────────────────────────────────────────────────────────
  if (step === 'validating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)]">Validando tu invitación...</p>
      </div>
    );
  }

  // ─── ERROR ─────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="text-5xl">❌</div>
        <h2 className="text-xl font-bold text-white">Enlace inválido</h2>
        <p className="text-[var(--text-muted)] max-w-sm">{errorMsg}</p>
        <p className="text-sm text-[var(--text-muted)]">Pide a Jimmy que te reenvíe la invitación.</p>
      </div>
    );
  }

  // ─── SUCCESS ───────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="text-6xl animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold text-white">¡Registro completado!</h2>
        <p className="text-[var(--text-muted)] max-w-sm">
          Ya formas parte del equipo de <strong className="text-[var(--gold)]">Jimmy Barber</strong>.<br/>
          Ahora puedes iniciar sesión con tu PIN en la sección <strong>Staff</strong>.
        </p>
        <button
          onClick={() => navigate('/barber')}
          className="btn-primary px-8 py-3 rounded-xl font-bold"
        >
          Ir al Login de Staff →
        </button>
      </div>
    );
  }

  // ─── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">✂️</div>
        <h1 className="text-2xl font-bold text-white mb-1">Completa tu Registro</h1>
        <p className="text-[var(--text-muted)] text-sm">
          Invitado como <span className="text-[var(--gold)] font-semibold">{inviteData?.email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nombre */}
        <div className="card p-4">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Tu nombre completo
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Carlos Rodríguez"
            required
            className="w-full bg-transparent text-white placeholder-[var(--text-muted)] outline-none text-base"
          />
        </div>

        {/* WhatsApp */}
        <div className="card p-4">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            WhatsApp (opcional)
          </label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
            placeholder="Ej: 3001234567"
            className="w-full bg-transparent text-white placeholder-[var(--text-muted)] outline-none text-base"
          />
        </div>

        {/* PIN */}
        <div className="card p-5">
          <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 text-center">
            Crea tu PIN de acceso
          </label>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? 'bg-[var(--gold)] border-[var(--gold)]'
                  : 'border-[var(--border)] bg-transparent'
              }`} />
            ))}
          </div>

          {/* PIN keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
              <button
                type="button"
                key={i}
                onClick={() => k === '⌫' ? handlePinDelete() : k !== '' && handlePinKey(String(k))}
                disabled={k === ''}
                className={`h-14 rounded-xl text-xl font-bold transition-all duration-150 ${
                  k === ''
                    ? 'invisible'
                    : k === '⌫'
                    ? 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-red-900/30 hover:text-red-400 border border-[var(--border)]'
                    : 'bg-[var(--bg-card)] text-white hover:bg-[var(--gold)] hover:text-black border border-[var(--border)] active:scale-95'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-center">
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || pin.length < 4}
          className="w-full btn-primary py-4 rounded-xl text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
              Registrando...
            </span>
          ) : '✅ Completar Registro'}
        </button>
      </form>
    </div>
  );
}
