
import React, { useState } from 'react';
import { User, PlatformSettings, UserRole } from '../types';
import { supabase, getCurrentProfile, generateShortId, getSettings, triggerWebhook } from '../database';
import { EyeIcon } from './icons/EyeIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';

interface LoginProps {
  onLogin: (user: User) => void;
  platformSettings: PlatformSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, platformSettings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  const FIXED_LOGO_URL = "https://radhkbocafjpglgmbpyy.supabase.co/storage/v1/object/public/product-images/products/ok%20trasparente.png";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      if (isRegistering) {
        const shortId = generateShortId();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { 
                name: cleanName,
                full_name: cleanName,
                short_id: shortId,
                status: 'pending' 
            }
          }
        });

        if (signUpError) {
            console.error("Signup Error:", signUpError);
            if (signUpError.message.includes("Database error")) {
                throw new Error("⚠️ BLOCCO DATABASE RILEVATO: Una versione precedente della tabella o dei trigger sta impedendo il salvataggio. Procedura di sblocco: 1. Vai in Diagnostica di Sistema. 2. Copia lo script Fix v34.0 (God Mode). 3. Eseguilo nel SQL Editor di Supabase. 4. Cancella eventuali utenti orfani in Supabase Auth e riprova.");
            }
            throw signUpError;
        }
        
        if (data.user) {
          try {
              const settings = await getSettings();
              if (settings.registration_webhook_url) {
                  await triggerWebhook(settings.registration_webhook_url, {
                      event: 'new_affiliate_registration',
                      name: cleanName,
                      email: cleanEmail,
                      short_id: shortId,
                      status: 'pending',
                      timestamp: new Date().toISOString()
                  });
              }
          } catch (webhookErr) {
              console.warn("Webhook registrazione fallito:", webhookErr);
          }

          await supabase.auth.signOut();
          setError('RICHIESTA INVIATA! Il tuo account è ora in fase di analisi. Riceverai una mail entro 24-48 ore se il tuo profilo sarà accettato.');
          setIsRegistering(false);
          setName('');
          setEmail('');
          setPassword('');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          const profile = await getCurrentProfile(data.user.id);
          
          if (profile) {
            if (profile.status === 'active') {
                if (profile.isBlocked) {
                    setError('ACCOUNT BLOCCATO: Il tuo profilo è stato disabilitato.');
                    await supabase.auth.signOut();
                } else {
                    onLogin(profile);
                }
            } else if (profile.status === 'pending') {
                setError('ACCESSO NEGATO: Il tuo account è ancora in fase di analisi (24-48h).');
                await supabase.auth.signOut();
            } else {
                setError('ACCOUNT DISABILITATO o RIFIUTATO.');
                await supabase.auth.signOut();
            }
          } else {
             setError('PROFILO NON TROVATO: Registrazione Auth riuscita ma sincronizzazione DB fallita. Esegui il Fix v34.0 nel SQL Editor per ricostruire la tabella profili.');
             await supabase.auth.signOut();
          }
        }
      }
    } catch (err: any) {
      let msg = err.message || 'Errore durante l\'autenticazione.';
      if (msg.includes("Invalid login credentials")) msg = "Credenziali non valide.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  
  const logoStyle = {
      width: `${platformSettings.logo_login_width || 128}px`,
      height: `${platformSettings.logo_login_height || 128}px`,
      objectFit: 'contain' as const,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-surface p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center gap-4 mb-2">
                <h1 className="text-4xl font-bold text-secondary italic tracking-tighter">MWS</h1>
                <img 
                    src={FIXED_LOGO_URL} 
                    alt="Logo Piattaforma" 
                    style={logoStyle}
                />
            </div>
            <h2 className="text-2xl font-bold text-primary mt-2">
              {isRegistering ? 'Crea Account' : 'Accedi'}
            </h2>
            <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest">Piattaforma Affiliate 2.0</p>
        </div>
        <form onSubmit={handleAuth} id="login-form">
          {isRegistering && (
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome e Cognome</label>
              <input 
                type="text" 
                id="name" 
                name="name"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" 
                required 
                autoComplete="name"
              />
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input 
                type="email" 
                id="email" 
                name="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                autoComplete="username" 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" 
                required 
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                name="password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete={isRegistering ? "new-password" : "current-password"} 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" 
                required 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 top-1 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {!isRegistering && (
              <div className="flex items-center mb-6">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer font-medium">
                    Rimani collegato (Memorizza accesso)
                  </label>
              </div>
          )}

          {error && (
            <div className={`p-4 rounded-lg text-sm mb-6 text-center font-bold border ${error.includes('INVIATA') ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-primary text-on-primary font-black py-3 px-4 rounded-lg hover:bg-primary-dark transition-all duration-200 shadow-md transform active:scale-[0.98]">
            {loading ? 'Attendi...' : (isRegistering ? 'Invia Richiesta' : 'Accedi')}
          </button>
          
          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-sm text-primary hover:underline font-semibold">
              {isRegistering ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati ora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
