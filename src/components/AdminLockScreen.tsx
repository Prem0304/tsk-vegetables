import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminLockScreenProps {
  currentPin: string;
  onUnlock: () => void;
  onChangePin: (newPin: string) => void;
}

export const AdminLockScreen: React.FC<AdminLockScreenProps> = ({
  currentPin,
  onUnlock,
  onChangePin,
}) => {
  const [inputPin, setInputPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);

  useEffect(() => {
    if (showChangePinModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showChangePinModal]);

  // Change PIN state
  const [oldPinInput, setOldPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [changeStatusMsg, setChangeStatusMsg] = useState<string>('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPin.trim() === currentPin.trim()) {
      setErrorMsg('');
      onUnlock();
    } else {
      setErrorMsg('Incorrect Admin Passcode! Please try again.');
      setInputPin('');
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPinInput.trim() !== currentPin.trim()) {
      setChangeStatusMsg('❌ Current Passcode is incorrect.');
      return;
    }
    if (!newPinInput.trim() || newPinInput.length < 4) {
      setChangeStatusMsg('❌ New Passcode must be at least 4 characters long.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setChangeStatusMsg('❌ New Passcodes do not match.');
      return;
    }

    onChangePin(newPinInput.trim());
    setChangeStatusMsg('✅ Passcode changed successfully!');
    setTimeout(() => {
      setShowChangePinModal(false);
      setOldPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setChangeStatusMsg('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-6 sm:p-8 space-y-6 bg-slate-900 border-slate-700 shadow-2xl text-center rounded-2xl relative">
        {/* Mandi Divine Header */}
        <div className="space-y-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 p-2 border-2 border-emerald-500/40 shadow-inner flex items-center justify-center overflow-hidden">
            <img
              src="/murugan_sketch.png"
              alt="Lord Murugan Sketch"
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>

          <div className="text-[11px] font-serif text-slate-400">
            ஸ்ரீ வாழகுருநாதன் துணை | ஸ்ரீ அங்காள ஈஸ்வரி துணை
          </div>

          <h1 className="text-2xl font-black text-slate-100 uppercase tracking-wider font-serif">
            T.S.K TRADERS
          </h1>
          <p className="text-xs text-emerald-400 font-semibold">
            Single-Admin Mandi Management System
          </p>
        </div>

        {/* Lock Status Card */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs flex items-center justify-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Restricted Admin Portal — Enter Password to Continue</span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 text-left animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex justify-between">
              <span>Admin Passcode / Password *</span>
              <span className="text-[10px] text-slate-400">Default: 1234</span>
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
                className="glass-input w-full text-base font-bold pr-10 py-3 text-center tracking-widest text-slate-100"
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

          <button
            type="submit"
            className="w-full glass-button-primary text-sm py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Unlock Mandi Dashboard
          </button>
        </form>

        {/* Change Passcode Option */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setShowChangePinModal(true)}
            className="text-xs text-slate-400 hover:text-emerald-400 underline font-medium"
          >
            Change Admin Passcode
          </button>
        </div>
      </div>

      {/* Change Passcode Drawer Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="glass-panel w-full max-w-sm p-6 space-y-4 bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Change Admin Passcode
            </h3>

            {changeStatusMsg && (
              <p className={`text-xs font-semibold p-2 rounded ${
                changeStatusMsg.includes('✅') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {changeStatusMsg}
              </p>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Current Passcode *</label>
                <input
                  type="password"
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(e.target.value)}
                  className="glass-input w-full"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">New Passcode *</label>
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Min 4 characters"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Confirm New Passcode *</label>
                <input
                  type="password"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  className="glass-input w-full"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="glass-button-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary py-1.5 px-4 text-xs"
                >
                  Save Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
