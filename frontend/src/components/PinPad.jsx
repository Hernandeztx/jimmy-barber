import React, { useState } from 'react';

export default function PinPad({ onVerify, error }) {
  const [pin, setPin] = useState('');

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-submit when 4 digits are entered
        onVerify(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="w-full max-w-sm mx-auto p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl animate-fadeslideup">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10">
          <span className="text-3xl">💈</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Acceso Staff</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ingresa tu PIN de 4 dígitos para acceder</p>
      </div>

      {/* Dots Display */}
      <div className="flex justify-center gap-5 mb-8">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full transition-all duration-200 border ${
              index < pin.length
                ? 'bg-[var(--gold)] border-[var(--gold)] scale-110 shadow-[0_0_8px_rgba(201,168,76,0.8)]'
                : 'bg-white/5 border-white/20'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-5 text-center text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl animate-shake">
          ⚠️ {error}
        </div>
      )}

      {/* Keyboard Grid */}
      <div className="grid grid-cols-3 gap-3">
        {digits.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-16 rounded-2xl text-2xl font-bold text-white hover:text-[#0A0A0A] bg-white/5 hover:bg-[var(--gold)] border border-white/5 hover:border-[var(--gold)] active:scale-95 transition-all duration-150 cursor-pointer"
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          className="h-16 rounded-2xl text-sm font-semibold text-white/50 hover:text-white bg-white/5 border border-white/5 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          Limpiar
        </button>

        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="h-16 rounded-2xl text-2xl font-bold text-white hover:text-[#0A0A0A] bg-white/5 hover:bg-[var(--gold)] border border-white/5 hover:border-[var(--gold)] active:scale-95 transition-all duration-150 cursor-pointer"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="h-16 rounded-2xl text-sm font-semibold text-white/50 hover:text-white bg-white/5 border border-white/5 active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
