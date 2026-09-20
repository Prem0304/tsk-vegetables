import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Eye, EyeOff, X } from 'lucide-react';

interface VerifyPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPin: string;
  actionTitle: string;
  actionDescription?: string;
}

export const VerifyPasswordModal: React.FC<VerifyPasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentPin,
  actionTitle,
  actionDescription,
}) => {
  const [inputPin, setInputPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPin.trim() === currentPin.trim()) {
      setErrorMsg('');
      setInputPin('');
      onConfirm();
      onClose();
    } else {
      setErrorMsg('❌ Incorrect Admin Passcode! Action blocked.');
      setInputPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-6 space-y-4 bg-slate-900 border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Password Verification Required
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs space-y-1">
          <strong className="text-amber-300 block">{actionTitle}</strong>
          {actionDescription && <p className="text-slate-300">{actionDescription}</p>}
        </div>

        {errorMsg && (
          <p className="text-xs font-bold text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1.5">
              Enter Admin Password to Authorize *
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={inputPin}
                onChange={(e) => {
                  setInputPin(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter password..."
                className="glass-input w-full text-base font-bold pr-10 py-2.5 text-center tracking-wider text-slate-100"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="glass-button-secondary py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button-primary py-2 px-5 bg-amber-600 hover:bg-amber-500"
            >
              <KeyRound className="w-4 h-4" />
              Authorize & Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
