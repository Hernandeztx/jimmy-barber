import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-jimmy.kc7r3m.easypanel.host';

export default function GoogleLoginButton({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full max-w-xs mx-auto py-4 px-6 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all duration-200 disabled:opacity-90 shadow-lg"
    >
      {loading ? (
        <span className="w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full animate-spin"/>
      ) : (
        <>
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31V21h2.12c2.1 0 3.88-.68 5.08-1.83l-2.71-2.71c-.89-.89-1.42-2.09-1.42-3.32 0-.62.12-1.23.34-1.82H12V8.51h9.61c.28.78.44 1.64.44 2.75z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.55-1.02 7.46-2.71l-2.71-2.71c-.98.68-2.22 1.1-3.51 1.1-2.71s.42-1.73.88-2.4L19.46 6C17.55 4.2 14.97 3 12 3 8.72 3 5.51 4.25 3.74 6.04l3.06 3.06C9.51 9.13 10.62 9 12 9c1.66 0 3.14.68 4.23 1.78l2.71 2.71c-.17.14-.38.28-.61.42-.23.14-.49.27-.76.38-2.38-.98-4.23-1.78-6.79-1.78-2.67 0-5 .7-7.15 1.92l-3.06-3.06C6.11 7.15 8.89 5 12 5c3.06 0 5.74 1.25 7.65 3.04l2.14 2.14c-1.44 1.34-3.22 2.13-5.79 2.13-1.66 0-3.14-.74-4.23-1.92l-3.06-3.06a11.97 11.97 0 0 1 4.23-1.92c2.97 0 5.55 1.02 7.46 2.71l-2.71 2.71c-.68.54-1.46.88-2.27.88-1.52 0 .75-.34 1.35-.88 2.27L12 19.49V15.5h5.92c.26 1.37 1.04 2.53 2.21 3.31L12 23z"/>
          </svg>
          <span className="text-lg font-medium">Continuar con Google</span>
        </>
      )}
    </button>
  );
}