
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { Member } from '../types';
import { 
  UserCircle, Lock, Mail, Building2, MapPin, 
  ShieldCheck, ArrowLeft, Loader2, Users, 
  TrendingUp, Globe, Sparkles, CheckCircle2
} from 'lucide-react';

interface AuthProps {
  onLogin: (user: Member) => void;
  onCancel?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [sector, setSector] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await storageService.login(email, password);
        if (user) onLogin(user);
        else setError('Email ou mot de passe incorrect.');
      } else {
        if (!name || !businessName || !email || !password || !city) {
          setError('Tous les champs sont requis.');
          setLoading(false);
          return;
        }
        const newUser = await storageService.register({
          name, email, password, businessName, sector, city, address, role
        });
        onLogin(newUser);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex relative bg-gray-50 overflow-hidden">
      {/* Custom CSS for background animation */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      {/* Left Side - Design & Info */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 text-white items-center justify-center overflow-hidden">
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 to-gray-900/90 z-0"></div>

        {/* Content */}
        <div className="relative z-10 p-12 max-w-xl">
          <div className="mb-8 flex items-center space-x-3">
             <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-8 h-8 text-primary-400" />
             </div>
             <h1 className="text-4xl font-bold tracking-tight">PR-CONNEXION</h1>
          </div>
          
          <h2 className="text-2xl font-light mb-8 text-gray-200">
            La plateforme digitale dédiée à l'excellence féminine entrepreneuriale.
          </h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <Users className="w-6 h-6 text-primary-400 mt-1" />
              <div>
                <h3 className="font-bold text-lg">Réseautage Puissant</h3>
                <p className="text-sm text-gray-300">Connectez-vous avec des femmes entrepreneures, partagez vos expériences et créez des synergies.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <TrendingUp className="w-6 h-6 text-blue-400 mt-1" />
              <div>
                <h3 className="font-bold text-lg">Accélération de Croissance</h3>
                <p className="text-sm text-gray-300">Accédez à des outils de suivi financier, des formations exclusives et des opportunités de marché.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
              <Globe className="w-6 h-6 text-green-400 mt-1" />
              <div>
                <h3 className="font-bold text-lg">Visibilité Accrue</h3>
                <p className="text-sm text-gray-300">Mettez en avant votre entreprise sur notre carte interactive et soyez trouvée par des partenaires.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center space-x-2 text-sm text-gray-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Plateforme sécurisée et développée par Powerful Reach.</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white relative">
        {onCancel && (
          <button onClick={onCancel} className="absolute top-6 left-6 flex items-center space-x-2 text-gray-500 hover:text-primary-600 transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /><span>Retour à l'accueil</span>
          </button>
        )}

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-full bg-primary-50 mb-4 lg:hidden">
               <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Bon retour parmi nous' : 'Rejoignez le Cluster'}
            </h2>
            <p className="text-gray-500 mt-2">
              {isLogin ? 'Accédez à votre espace membre.' : 'Créez votre compte pour commencer.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm flex items-start">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="animate-in slide-in-from-bottom-5 fade-in duration-300 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center transition-all ${role === 'MEMBER' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <input type="radio" checked={role === 'MEMBER'} onChange={() => setRole('MEMBER')} className="hidden"/>
                      <UserCircle className="w-6 h-6 mb-1" />
                      <span className="text-sm font-bold">Membre</span>
                   </label>
                   <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center justify-center transition-all ${role === 'ADMIN' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <input type="radio" checked={role === 'ADMIN'} onChange={() => setRole('ADMIN')} className="hidden"/>
                      <ShieldCheck className="w-6 h-6 mb-1" />
                      <span className="text-sm font-bold">Admin</span>
                   </label>
                </div>

                <div className="relative">
                  <UserCircle className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e=>setName(e.target.value)} 
                    placeholder="Nom et Prénom" 
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  />
                </div>

                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={businessName} 
                    onChange={e=>setBusinessName(e.target.value)} 
                    placeholder="Nom de l'entreprise" 
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <select 
                    value={city} 
                    onChange={e=>setCity(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-gray-700 appearance-none"
                  >
                      <option value="">Sélectionner une ville...</option>
                      <option value="Kinshasa">Kinshasa</option>
                      <option value="Pointe-Noire">Pointe-Noire</option>
                      <option value="Brazzaville">Brazzaville</option>
                      <option value="Lubumbashi">Lubumbashi</option>
                      <option value="Goma">Goma</option>
                      <option value="Matadi">Matadi</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e=>setEmail(e.target.value)} 
                  placeholder="Adresse Email" 
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  placeholder="Mot de passe" 
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-primary-600 text-white py-3.5 rounded-lg font-bold hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-all flex justify-center items-center shadow-lg shadow-primary-500/30"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5"/> : (isLogin ? 'Se connecter' : 'Créer mon compte')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? "Pas encore membre ?" : "Vous avez déjà un compte ?"}
            </p>
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="mt-2 text-primary-600 font-bold hover:text-primary-700 hover:underline transition-colors"
            >
              {isLogin ? "Créer un compte gratuitement" : "Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
