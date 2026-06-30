import { useState } from 'react';
import { googleLogin } from '../services/api';

export default function GoogleLoginButton({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
      // Para demo: usa login demo si no hay OAuth configurado
      const demoEmail = `cliente${Date.now()}@gmail.com`;
      const demoName = `Cliente ${Math.floor(1000 + Math.random() * 9000)}`;
      
      const result = await googleLogin({ email: demoEmail, nombre: demoName });
      
      if (result.needsPhone) {
        localStorage.setItem('user', JSON.stringify(result.user));
        onLogin({ ...result.user, needsPhone: true });
      } else {
        localStorage.setItem('user', JSON.stringify(result.user));
        onLogin(result.user);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all duration-200 disabled:opacity-50"
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"/>
      ) : (
        <>
          <span className="text-lg font-bold">G</span>
          <span className="text-blue-500 font-bold">Iniciar con Google</span>
        </>
      )}
    </button>
  );
}