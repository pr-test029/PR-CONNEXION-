import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { AppView, Member, TrainingResource } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  Award, 
  Briefcase, 
  TrendingUp, 
  CheckCircle, 
  Edit2, 
  Save, 
  PlayCircle, 
  FileText, 
  ArrowLeft, 
  UserCog, 
  X,
  ShieldCheck,
  Camera,
  Upload
} from 'lucide-react';

interface ProfileProps {
  setView: (view: AppView) => void;
  viewedMemberId?: string;
  currentUser: Member | null;
}

export const Profile: React.FC<ProfileProps> = ({ setView, viewedMemberId, currentUser }) => {
  const [user, setUser] = useState<Member | null>(null);
  const [allTrainings, setAllTrainings] = useState<TrainingResource[]>([]);
  const [financialData, setFinancialData] = useState([
    { month: 'Jan', CA: 4000, Capital: 2400 },
    { month: 'Fév', CA: 3000, Capital: 2300 },
    { month: 'Mar', CA: 5000, Capital: 2800 },
    { month: 'Avr', CA: 4500, Capital: 3200 },
    { month: 'Mai', CA: 6000, Capital: 3800 },
    { month: 'Juin', CA: 7500, Capital: 4500 },
    { month: 'Juil', CA: 6800, Capital: 4600 },
    { month: 'Août', CA: 7200, Capital: 4800 },
    { month: 'Sept', CA: 8000, Capital: 5000 },
    { month: 'Oct', CA: 7800, Capital: 5200 },
    { month: 'Nov', CA: 8500, Capital: 5500 },
    { month: 'Déc', CA: 9000, Capital: 6000 },
  ]);

  // UI States
  const [isEditingFinance, setIsEditingFinance] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Profile Edit Form States
  const [editForm, setEditForm] = useState({
    name: '',
    businessName: '',
    sector: '',
    city: '',
    address: '',
    email: '',
    role: 'MEMBER' as 'ADMIN' | 'MEMBER'
  });
  
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if we are viewing the current logged-in user's profile
  const isOwnProfile = !viewedMemberId || (currentUser && viewedMemberId === currentUser.id);
  const displayMemberId = viewedMemberId || currentUser?.id;

  useEffect(() => {
    const fetchData = async () => {
      if (displayMemberId) {
        const members = await storageService.getAllMembers();
        const foundUser = members.find(m => m.id === displayMemberId);
        setUser(foundUser || null);
      }
      const trainings = await storageService.getTrainings();
      setAllTrainings(trainings);
    };
    fetchData();
  }, [displayMemberId]);

  const handleOpenEditProfile = () => {
    if (user) {
      setEditForm({
        name: user.name,
        businessName: user.businessName,
        sector: user.sector,
        city: user.location.city,
        address: user.location.address,
        email: user.email || '',
        role: user.role || 'MEMBER'
      });
      setPreviewAvatar(user.avatar);
      setIsEditProfileModalOpen(true);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const payload: any = {
      name: editForm.name,
      businessName: editForm.businessName,
      sector: editForm.sector,
      email: editForm.email,
      city: editForm.city,
      address: editForm.address,
      role: editForm.role
    };

    if (previewAvatar && previewAvatar !== user.avatar) {
      payload.avatar = previewAvatar;
    }

    try {
        const updatedUser = await storageService.updateUser(user.id, payload);
        if (updatedUser) {
          setUser(updatedUser);
          setIsEditProfileModalOpen(false);
        }
    } catch (error: any) {
        alert(error.message || "Erreur lors de la sauvegarde du profil.");
    }
  };

  // Map status based on user data
  const completedIds = user?.completedTrainings || [];
  
  const profileTrainings = allTrainings.map(t => ({
    ...t,
    completed: completedIds.includes(t.id)
  }));

  const progressPercentage = allTrainings.length > 0 
    ? Math.round((completedIds.length / allTrainings.length) * 100) 
    : 0;

  const handleFinanceChange = (index: number, field: 'CA' | 'Capital', value: string) => {
    const numValue = parseInt(value) || 0;
    const newData = [...financialData];
    newData[index] = { ...newData[index], [field]: numValue };
    setFinancialData(newData);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-20">
      
      {/* Back Button if viewing other profile */}
      {!isOwnProfile && (
        <button 
          onClick={() => setView(AppView.FEED)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-2 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour au fil d'actualité
        </button>
      )}

      {/* Header Card */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary-600 to-primary-800"></div>
        
        {isOwnProfile && (
          <button 
            onClick={handleOpenEditProfile}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur text-white p-2 rounded-lg transition-all z-10 flex items-center space-x-2 border border-white/30"
            title="Modifier mon profil"
          >
            <UserCog className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Modifier infos</span>
          </button>
        )}

        <div className="relative pt-12 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
          <div className="relative group">
             <img 
              src={user.avatar} 
              alt="Profile" 
              className="w-24 h-24 rounded-full border-4 border-white dark:border-dark-card shadow-md object-cover bg-white"
            />
            {user.role === 'ADMIN' && (
              <div className="absolute bottom-0 right-0 bg-white dark:bg-dark-card rounded-full p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                 <div className="bg-red-500 rounded-full p-1">
                   <ShieldCheck className="w-3 h-3 text-white" />
                 </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start">
              {user.name}
              {user.role === 'ADMIN' ? (
                <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                </span>
              ) : (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-full flex items-center">
                   Membre
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{user.businessName} - {user.sector}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.location.address}, {user.location.city}</p>
            <div className="flex items-center justify-center md:justify-start mt-2 space-x-2">
              {user.badges.map(badge => (
                <span key={badge} className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded uppercase flex items-center">
                  <Award className="w-3 h-3 mr-1" /> {badge}
                </span>
              ))}
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded uppercase flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" /> {user.status}
              </span>
            </div>
          </div>
          <div className="flex space-x-3 pb-2">
             <div className="text-center px-4 border-r border-gray-200 dark:border-gray-700">
                <span className="block text-lg font-bold text-gray-900 dark:text-white">12</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Projets</span>
             </div>
             <div className="text-center px-4">
                <span className="block text-lg font-bold text-gray-900 dark:text-white">{progressPercentage}%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Progression</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart & Data Entry */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
              {isOwnProfile ? 'Mon Évolution Financière' : `Évolution de ${user.name.split(' ')[0]}`}
            </h2>
            
            {isOwnProfile && (
              <button 
                onClick={() => setIsEditingFinance(!isEditingFinance)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  isEditingFinance 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {isEditingFinance ? <Save className="w-4 h-4 mr-1" /> : <Edit2 className="w-4 h-4 mr-1" />}
                <span>{isEditingFinance ? 'Terminer' : 'Saisir mes données'}</span>
              </button>
            )}
          </div>

          {/* Data Entry Grid (Visible when editing) */}
          {isEditingFinance && isOwnProfile && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Saisissez vos montants mensuels pour mettre à jour le graphique :</p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <div className="text-xs font-bold text-gray-400 uppercase">Mois</div>
                <div className="text-xs font-bold text-red-500 uppercase">C.A. (FC)</div>
                <div className="text-xs font-bold text-blue-500 uppercase">Capital (FC)</div>
                
                {financialData.map((data, idx) => (
                  <React.Fragment key={data.month}>
                    <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">{data.month}</div>
                    <input 
                      type="number" 
                      value={data.CA} 
                      onChange={(e) => handleFinanceChange(idx, 'CA', e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500 outline-none dark:text-white"
                    />
                    <input 
                      type="number" 
                      value={data.Capital} 
                      onChange={(e) => handleFinanceChange(idx, 'Capital', e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500 outline-none dark:text-white"
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData}>
                <defs>
                  <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />
                <Area type="monotone" dataKey="CA" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCA)" name="Chiffre d'Affaires" />
                <Area type="monotone" dataKey="Capital" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCap)" name="Capital" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Training Timeline / History */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[450px]">
           <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-6 shrink-0">
              <Briefcase className="w-5 h-5 mr-2 text-primary-600" />
              {isOwnProfile ? 'Mon Parcours de Formation' : 'Formations suivies'}
            </h2>
            
            <div className="flex-1 space-y-0 overflow-y-auto pr-2 custom-scrollbar">
              {profileTrainings.length === 0 ? (
                 <p className="text-sm text-gray-400 italic text-center py-10">Aucune formation disponible.</p>
              ) : (
                profileTrainings.map((training, index) => (
                  <div key={training.id} className="relative flex items-start group pb-6 last:pb-0">
                    {/* Line */}
                    {index !== profileTrainings.length - 1 && (
                      <div className="absolute left-[11px] top-7 h-full w-0.5 bg-gray-100 dark:bg-gray-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors"></div>
                    )}
                    
                    {/* Status Icon */}
                    <div className={`
                      relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white dark:bg-dark-card mr-4 shrink-0 transition-all
                      ${training.completed 
                        ? 'border-green-500 text-green-500' 
                        : 'border-gray-300 dark:border-gray-600 text-gray-400'
                      }
                    `}>
                      {training.completed ? (
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      )}
                    </div>

                    <div className="flex-1 pt-0.5">
                      <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-bold transition-colors ${training.completed ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                          {training.title}
                        </h4>
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {training.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{training.description}</p>
                      
                      {training.completed ? (
                         <span className="text-xs text-green-600 font-medium flex items-center mt-1">
                           <CheckCircle className="w-3 h-3 mr-1" /> Complété
                         </span>
                      ) : (
                         // Only show "Continue" button for own profile
                         isOwnProfile && (
                           <button 
                             onClick={() => setView(AppView.TRAINING)}
                             className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center mt-1 hover:underline"
                           >
                             <PlayCircle className="w-3 h-3 mr-1" /> Commencer
                           </button>
                         )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {isOwnProfile && (
               <button 
                onClick={() => setView(AppView.TRAINING)}
                className="w-full mt-4 bg-gray-50 dark:bg-gray-800 text-primary-600 dark:text-primary-400 font-bold py-3 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 hover:shadow-sm transition-all border-2 border-dashed border-primary-200 dark:border-gray-700 flex items-center justify-center shrink-0"
              >
                <FileText className="w-4 h-4 mr-2" />
                Accéder au catalogue complet
              </button>
            )}
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <UserCog className="w-5 h-5 mr-2 text-primary-600" />
                Modifier mes informations
              </h3>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Profile Picture Upload Section */}
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <img 
                    src={previewAvatar || editForm.name} // Fallback safe
                    alt="Avatar Preview" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 group-hover:border-primary-200 transition-colors"
                   />
                   <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white" />
                   </div>
                   <div className="absolute bottom-0 right-0 bg-primary-600 p-1.5 rounded-full border-2 border-white dark:border-dark-card shadow-sm">
                      <Upload className="w-3 h-3 text-white" />
                   </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Cliquez pour changer la photo</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              {/* Role Toggle Section */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                 <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">Mon Statut Cluster</label>
                 <div className="flex space-x-3">
                    <button
                      onClick={() => setEditForm({ ...editForm, role: 'MEMBER' })}
                      className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        editForm.role === 'MEMBER' 
                        ? 'bg-white dark:bg-gray-700 border-primary-500 text-primary-700 dark:text-primary-400 shadow-sm' 
                        : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      Membre
                    </button>
                    <button
                      onClick={() => setEditForm({ ...editForm, role: 'ADMIN' })}
                      className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        editForm.role === 'ADMIN' 
                        ? 'bg-white dark:bg-gray-700 border-red-500 text-red-700 dark:text-red-400 shadow-sm' 
                        : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Administrateur
                    </button>
                 </div>
                 <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                   {editForm.role === 'ADMIN' 
                     ? "En tant qu'administrateur, vous pourrez gérer les annonces et la stratégie." 
                     : "Le statut membre vous permet de publier et suivre des formations."}
                 </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nom Complet</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Entreprise</label>
                   <input 
                    type="text" 
                    value={editForm.businessName}
                    onChange={(e) => setEditForm({...editForm, businessName: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Secteur</label>
                   <select 
                      value={editForm.sector}
                      onChange={(e) => setEditForm({...editForm, sector: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                    >
                      <option value="Agroalimentaire">Agroalimentaire</option>
                      <option value="Textile">Textile</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Services">Services</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Autre">Autre</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Ville</label>
                    <select 
                      value={editForm.city}
                      onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                    >
                      <option value="Kinshasa">Kinshasa</option>
                      <option value="Pointe-Noire">Pointe-Noire</option>
                      <option value="Brazzaville">Brazzaville</option>
                      <option value="Lubumbashi">Lubumbashi</option>
                      <option value="Goma">Goma</option>
                      <option value="Matadi">Matadi</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
                    <input 
                      type="text" 
                      value={editForm.address}
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                    />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                />
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 rounded">
                 <p className="text-xs text-yellow-800 dark:text-yellow-300">
                   Note: La modification de votre ville mettra automatiquement à jour votre position sur la carte des membres.
                 </p>
              </div>

            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end space-x-3 shrink-0">
              <button 
                onClick={() => setIsEditProfileModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};