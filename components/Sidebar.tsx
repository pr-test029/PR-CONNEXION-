
import React from 'react';
import { AppView, Member } from '../types';
import { 
  LayoutDashboard, Users, MapPin, GraduationCap, UserCircle, LogOut,
  ShieldAlert, LogIn, MessagesSquare, Settings
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  currentUser: Member | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen,
  onLogout,
  currentUser
}) => {
  const menuItems = [
    { id: AppView.FEED, label: 'Fil d\'Actualité', icon: Users },
    { id: AppView.DISCUSSION, label: 'Discussion', icon: MessagesSquare },
    { id: AppView.MAP, label: 'Carte des Membres', icon: MapPin },
    { id: AppView.TRAINING, label: 'Formations', icon: GraduationCap },
    { id: AppView.DASHBOARD, label: 'Tableau de Bord', icon: LayoutDashboard },
  ];

  if (currentUser) {
    menuItems.splice(3, 0, { id: AppView.PROFILE, label: 'Mon Parcours', icon: UserCircle });
  }

  if (currentUser?.role === 'ADMIN') {
    menuItems.push({ id: AppView.ADMIN, label: 'Administration', icon: ShieldAlert });
  }

  const handleNavClick = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-30 h-screen w-64 border-r transition-transform duration-300 ease-in-out
        bg-white border-gray-200 dark:bg-dark-card dark:border-gray-800
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        <div className="h-16 flex items-center justify-center border-b border-primary-100 dark:border-gray-800 bg-primary-50 dark:bg-gray-900">
          <h1 className="text-xl font-bold text-primary-600 tracking-wider">PR-CONNEXION</h1>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-4rem)] flex flex-col justify-between">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200
                    ${isActive 
                      ? 'bg-primary-50 text-primary-600 font-medium shadow-sm border-l-4 border-primary-600 dark:bg-gray-800 dark:text-primary-400' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
               onClick={() => handleNavClick(AppView.SETTINGS)}
               className={`
                 w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 mb-2
                 ${currentView === AppView.SETTINGS 
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                 }
               `}
            >
               <Settings className="w-5 h-5" />
               <span>Paramètres</span>
            </button>

            {currentUser ? (
              <button 
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Déconnexion</span>
              </button>
            ) : (
              <button 
                onClick={() => handleNavClick(AppView.AUTH)}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span>Se Connecter</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
