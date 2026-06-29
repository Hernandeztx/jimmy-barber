import { useState } from 'react';
import { googleLogin } from '../services/api';

export default function GoogleLoginButton({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    const randomEmail = `user${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;
    const randomName = `Usuario ${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      const result = await googleLogin({ email: randomEmail, nombre: randomName });
      
      if (result.needsPhone) {
        localStorage.setItem('user', JSON.stringify(result.user));
        onLogin({ ...result.user, needsPhone: true });
      } else {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
    } catch (err) {
      console.error('Google login error:', err);
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
          <span className="text-lg">🔵</span>
          Iniciar con Google (Demo)
        </>
      )}
    </button>
  );
}