import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Feed } from './components/Feed';
import { MemberMap } from './components/MemberMap';
import { Profile } from './components/Profile';
import { Training } from './components/Training';
import { Dashboard } from './components/Dashboard';
import { AIChat } from './components/AIChat';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { Notifications } from './components/Notifications';
import { GeneralDiscussion } from './components/GeneralDiscussion';
import { Settings } from './components/Settings';
import { AppView, Member, Notification } from './types';
import { Menu, Bell, Sparkles, LogIn, Loader2 } from 'lucide-react';
import { CLUSTER_INFO } from './constants';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [currentView, setView] = useState<AppView>(AppView.FEED);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });
  
  const [viewedMemberId, setViewedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const user = await storageService.getCurrentUser();
        setCurrentUser(user);
        setNotifications(storageService.getNotifications());
      } catch (e) {
        console.error("Init error", e);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogin = (user: Member) => {
    setCurrentUser(user);
    setView(AppView.FEED);
  };

  const handleLogout = async () => {
    await storageService.logout();
    setCurrentUser(null);
    setViewedMemberId(null);
    setView(AppView.FEED);
  };

  const handleShowProfile = (memberId: string) => {
    setViewedMemberId(memberId);
    setView(AppView.PROFILE);
  };

  const handleSidebarNav = (view: AppView) => {
    if (view === AppView.PROFILE && currentUser) {
      setViewedMemberId(currentUser.id);
    }
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.AUTH:
        return <Auth onLogin={handleLogin} onCancel={() => setView(AppView.FEED)} />;
      case AppView.FEED:
        return <Feed onAuthorClick={handleShowProfile} currentUser={currentUser} />;
      case AppView.DISCUSSION:
        return <GeneralDiscussion currentUser={currentUser} />;
      case AppView.MAP:
        return <MemberMap currentUser={currentUser} />;
      case AppView.PROFILE:
        return (
          <Profile 
            setView={setView} 
            viewedMemberId={viewedMemberId || currentUser?.id}
            currentUser={currentUser}
          />
        );
      case AppView.TRAINING:
        return <Training currentUser={currentUser} />;
      case AppView.DASHBOARD:
        return <Dashboard />;
      case AppView.ADMIN:
        return <AdminPanel currentUser={currentUser} />;
      case AppView.NOTIFICATIONS:
        return <Notifications />;
      case AppView.SETTINGS:
        return <Settings theme={theme} toggleTheme={toggleTheme} />;
      default:
        return <Feed onAuthorClick={handleShowProfile} currentUser={currentUser} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="flex flex-col items-center">
           <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
           <p className="text-gray-500 dark:text-gray-400">Chargement du Cluster...</p>
        </div>
      </div>
    );
  }

  if (currentView === AppView.AUTH) {
    return <Auth onLogin={handleLogin} onCancel={() => setView(AppView.FEED)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        setView={handleSidebarNav} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between lg:justify-end shadow-sm z-10 transition-colors">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-6">
             <button 
              onClick={() => setView(AppView.NOTIFICATIONS)}
              className={`relative text-gray-400 hover:text-primary-600 transition-colors ${currentView === AppView.NOTIFICATIONS ? 'text-primary-600' : ''}`}
             >
               <Bell className="w-6 h-6" />
               {notifications.length > 0 && (
                 <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
               )}
             </button>
             
             <div className="flex items-center space-x-3 pl-6 border-l border-gray-100 dark:border-gray-700">
               {currentUser ? (
                 <>
                   <div className="text-right hidden md:block">
                     <p className="text-sm font-bold text-gray-900 dark:text-white">{currentUser.name}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">
                       {currentUser.role === 'ADMIN' ? 'Administrateur' : currentUser.businessName}
                     </p>
                   </div>
                   <img 
                     src={currentUser.avatar} 
                     alt="Profile" 
                     className="w-10 h-10 rounded-full border-2 border-gray-100 dark:border-gray-700 cursor-pointer hover:border-primary-300 transition-colors object-cover"
                     onClick={() => handleShowProfile(currentUser.id)}
                   />
                 </>
               ) : (
                 <button
                   onClick={() => setView(AppView.AUTH)}
                   className="flex items-center space-x-2 text-primary-600 font-medium hover:bg-primary-50 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                 >
                   <LogIn className="w-5 h-5" />
                   <span className="hidden md:inline">Se connecter</span>
                 </button>
               )}
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {currentView === AppView.FEED && 'Fil d\'Actualité'}
                  {currentView === AppView.DISCUSSION && 'Discussion Générale'}
                  {currentView === AppView.MAP && 'Carte des Membres'}
                  {currentView === AppView.PROFILE && (currentUser && viewedMemberId === currentUser.id ? 'Mon Parcours' : 'Profil Membre')}
                  {currentView === AppView.TRAINING && 'Centre de Formation'}
                  {currentView === AppView.DASHBOARD && 'Tableau de Bord Cluster'}
                  {currentView === AppView.ADMIN && 'Panneau d\'Administration'}
                  {currentView === AppView.NOTIFICATIONS && 'Annonces & Messages'}
                  {currentView === AppView.SETTINGS && 'Paramètres'}
                </h2>
             </div>
             {renderContent()}
           </div>
        </main>
      </div>

      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-28 right-6 bg-gradient-to-r from-primary-600 to-primary-500 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 z-40 group"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
        </button>
      )}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default App;