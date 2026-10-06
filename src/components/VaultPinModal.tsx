import React, { useState } from 'react';
import { X, Lock, KeyRound, ShieldAlert, Check } from 'lucide-react';

interface VaultPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPin: string | null;
  onUnlockSuccess: () => void;
  onSetNewPin: (pin: string) => void;
}

export const VaultPinModal: React.FC<VaultPinModalProps> = ({
  isOpen,
  onClose,
  existingPin,
  onUnlockSuccess,
  onSetNewPin,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isSetupMode = !existingPin;

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setErrorMsg('');

      if (next.length === 4) {
        if (isSetupMode) {
          onSetNewPin(next);
          setEnteredPin('');
          onClose();
        } else {
          if (next === existingPin) {
            setEnteredPin('');
            onUnlockSuccess();
            onClose();
          } else {
            setErrorMsg('PIN salah, silakan coba lagi.');
            setEnteredPin('');
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
          <Lock className="w-6 h-6 stroke-[2]" />
        </div>

        <h3 className="text-base font-bold text-zinc-100 font-display">
          {isSetupMode ? 'Buat PIN Brankas' : 'Buka Brankas Pribadi'}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 mb-5">
          {isSetupMode
            ? 'Tentukan 4 digit angka PIN untuk mengunci media pribadi Anda'
            : 'Masukkan 4 digit angka PIN untuk mengakses'}
        </p>

        {/* 4 dots display */}
        <div className="flex items-center justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < enteredPin.length
                  ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-500/50'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 mb-3 animate-shake font-medium">
            {errorMsg}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => {
            if (k === '') return <div key={i} />;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === '⌫') handleBackspace();
                  else handleDigit(k);
                }}
                className="h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold text-zinc-200 active:scale-95 transition-all flex items-center justify-center"
              >
                {k}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-300 py-1 transition-colors"
        >
          Batalkan
        </button>
      </div>
    </div>
  );
};
