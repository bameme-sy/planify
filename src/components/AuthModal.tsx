import React, { useState } from 'react';
import { User } from '../types';
import { registerUser, loginUser } from '../utils/authStorage';
import { UserCheck, LogIn, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onAuthSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (isRegisterMode) {
        if (!name.trim() || !username.trim() || !email.trim()) {
          setErrorMsg('Veuillez renseigner tous les champs obligatoires.');
          return;
        }
        const created = registerUser(name, username, email, password);
        onAuthSuccess(created);
      } else {
        if (!email.trim()) {
          setErrorMsg('Veuillez renseigner votre email ou pseudo.');
          return;
        }
        const logged = loginUser(email);
        onAuthSuccess(logged);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Une erreur s'est produite.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div 
        className="bg-white dark:bg-[#252528] rounded-xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Calendar macOS App Icon */}
        <div className="p-5 pb-3 border-b border-[#e5e5ea] dark:border-[#38383a] text-center bg-[#f6f6f7] dark:bg-[#202022] shrink-0">
          <div className="h-12 w-12 rounded-xl bg-white dark:bg-[#1e1e1e] border border-[#d1d1d6] dark:border-[#48484a] shadow-md mx-auto mb-2 overflow-hidden flex flex-col">
            <div className="h-3.5 bg-[#ff3b30] flex items-center justify-center text-[7px] font-bold text-white tracking-widest uppercase">
              CAL
            </div>
            <div className="flex-1 flex items-center justify-center font-semibold text-[17px] text-[#1d1d1f] dark:text-[#f5f5f7]">
              {new Date().getDate()}
            </div>
          </div>

          <h2 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
            Calendrier Hebdo
          </h2>
          <p className="text-[11px] text-[#8e8e93] mt-0.5">
            Connectez votre compte pour gérer vos horaires
          </p>

          {/* Mode Switch Tabs in Apple Segmented Style */}
          <div className="inline-flex p-[2px] mt-2.5 rounded-[7px] bg-[#e3e3e8] dark:bg-[#3a3a3c] w-full">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setErrorMsg('');
              }}
              className={`flex-1 py-1 text-[12px] font-medium rounded-[5px] transition-all ${
                isRegisterMode
                  ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                  : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              Créer un compte
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setErrorMsg('');
              }}
              className={`flex-1 py-1 text-[12px] font-medium rounded-[5px] transition-all ${
                !isRegisterMode
                  ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                  : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              Se connecter
            </button>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-[6px] bg-[#ff3b30]/10 border border-[#ff3b30]/30 text-[11px] font-medium text-[#ff3b30]">
              {errorMsg}
            </div>
          )}

          {isRegisterMode && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alexandre Moreau"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
                  Identifiant (@pseudo)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8e8e93] text-[12px]">@</span>
                  <input
                    type="text"
                    required
                    placeholder="alexandre"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-6 pr-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
              {isRegisterMode ? 'Adresse e-mail' : 'E-mail ou @pseudo'}
            </label>
            <input
              type="text"
              required
              placeholder={isRegisterMode ? "alexandre@example.com" : "Email ou @pseudo..."}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8e8e93] dark:text-[#98989d] block mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2.5 py-1 text-[12px] rounded-[6px] border border-[#d1d1d6] dark:border-[#48484a] bg-white dark:bg-[#1e1e1e] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[6px] bg-[#007aff] hover:bg-[#0069d9] active:bg-[#0051a8] text-white font-medium text-[13px] shadow-2xs transition-colors"
          >
            {isRegisterMode ? <UserCheck className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
            <span>{isRegisterMode ? 'Créer le compte' : 'Connexion'}</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
};
