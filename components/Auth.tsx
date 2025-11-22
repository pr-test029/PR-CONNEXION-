
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { Member } from '../types';
import { UserCircle, Lock, Mail, Building2, ArrowRight, MapPin, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      {onCancel && (
        <button onClick={onCancel} className="absolute top-4 left-4 flex items-center space-x-2 text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
          <ArrowLeft className="w-4 h-4" /><span>Retour</span>
        </button>
      )}

      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10">
        <div className="md:w-5/12 bg-gradient-to-br from-primary-700 to-primary-900 p-10 text-white flex flex-col justify-between">
          <h1 className="text-3xl font-bold tracking-wider">PR-CONNEXION</h1>
          <p className="text-sm text-primary-200">Connectez-vous au Cluster.</p>
        </div>

        <div className="md:w-7/12 p-10 flex flex-col justify-center overflow-y-auto max-h-screen">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{isLogin ? 'Connexion' : 'Inscription'}</h2>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="flex space-x-4 mb-4">
                    <label className="flex items-center"><input type="radio" checked={role === 'MEMBER'} onChange={() => setRole('MEMBER')} className="mr-2"/> Membre</label>
                    <label className="flex items-center"><input type="radio" checked={role === 'ADMIN'} onChange={() => setRole('ADMIN')} className="mr-2"/> Admin</label>
                </div>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nom complet" className="w-full border p-2 rounded"/>
                <input type="text" value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Entreprise" className="w-full border p-2 rounded"/>
                <select value={city} onChange={e=>setCity(e.target.value)} className="w-full border p-2 rounded">
                    <option value="">Ville...</option>
                    <option value="Kinshasa">Kinshasa</option>
                    <option value="Pointe-Noire">Pointe-Noire</option>
                    <option value="Brazzaville">Brazzaville</option>
                </select>
              </>
            )}
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border p-2 rounded"/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="w-full border p-2 rounded"/>
            
            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded hover:bg-primary-700 flex justify-center">
              {loading ? <Loader2 className="animate-spin"/> : (isLogin ? 'Se connecter' : 'S\'inscrire')}
            </button>
          </form>
          <button onClick={() => setIsLogin(!isLogin)} className="mt-4 text-sm text-primary-600 hover:underline text-center block w-full">
            {isLogin ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
        </div>
      </div>
    </div>
  );
};
