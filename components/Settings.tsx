import React from 'react';
import { Moon, Sun, Globe, Bell, Mail, Phone, MapPin, ChevronRight, Laptop, Info } from 'lucide-react';

interface SettingsProps {
  theme: string;
  toggleTheme: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ theme, toggleTheme }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres & À Propos</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
           Gérez vos préférences et découvrez l'histoire de la plateforme.
        </p>
      </div>

      {/* Theme & Preferences Section */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
            <Laptop className="w-5 h-5 mr-2 text-primary-600" />
            Apparence & Préférences
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Thème d'affichage</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Mode Sombre activé' : 'Mode Clair activé'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={toggleTheme}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between opacity-50 cursor-not-allowed" title="Fonctionnalité bientôt disponible">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Langue</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Français (Défaut)</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between opacity-50 cursor-not-allowed" title="Fonctionnalité bientôt disponible">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-red-100 text-red-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gérer les alertes</p>
              </div>
            </div>
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600">
                <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white"/>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
            <Info className="w-5 h-5 mr-2 text-primary-600" />
            À Propos de la Plateforme
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            La plateforme <strong className="text-primary-600">PR-CONNEXION</strong> a été créée pour répondre aux besoins spécifiques du 
            Cluster Congo Entreprise Développement. Notre mission est de fournir un espace numérique sécurisé et professionnel 
            permettant aux femmes entrepreneures de se connecter, de se former et de croître ensemble.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Elle centralise les outils nécessaires à la gestion moderne d'une activité : suivi financier, géolocalisation des membres, 
            ressources pédagogiques et communication en temps réel.
          </p>
        </div>
      </div>

      {/* Agency Credits Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg overflow-hidden text-white relative">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <Laptop className="w-48 h-48 text-white" />
        </div>
        
        <div className="p-8 relative z-10">
          <p className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Développé par</p>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
            {/* Logo Section */}
            <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden p-2">
               <img 
                 src="/logo_powerful_reach.png"
                 onError={(e) => {
                    e.currentTarget.src = "https://ui-avatars.com/api/?name=Powerful+Reach&background=000000&color=ffffff&size=128&bold=true";
                 }}
                 alt="Agence Powerful Reach Logo" 
                 className="w-full h-full object-contain"
               />
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">POWERFUL REACH</h1>
              <p className="text-gray-300 text-sm max-w-lg">
                Agence de développement digital et d'innovation technologique. 
                Nous transformons vos visions en solutions numériques performantes, intuitives et scalables.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-700 pt-6">
            <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
              <Phone className="w-5 h-5 text-primary-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Contact & WhatsApp</p>
                <p className="text-sm font-medium">+242 06 769 61 57</p>
                <p className="text-sm font-medium">+242 05 013 32 71</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
              <Mail className="w-5 h-5 text-primary-400" />
              <div className="overflow-hidden">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Email</p>
                <p className="text-xs font-medium truncate" title="powerfulreach029@gmail.com">powerfulreach029@gmail.com</p>
                <p className="text-xs font-medium truncate" title="paulndamba2@gmail.com">paulndamba2@gmail.com</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
              <MapPin className="w-5 h-5 text-primary-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Localisation</p>
                <p className="text-sm font-medium">Congo-Brazzaville</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};