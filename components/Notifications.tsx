import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { Notification, ClusterVictory } from '../types';
import { Bell, Calendar, Trophy } from 'lucide-react';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [victories, setVictories] = useState<ClusterVictory[]>([]);

  useEffect(() => {
    setNotifications(storageService.getNotifications());
    setVictories(storageService.getVictories());
  }, []);

  return (
    <div className="max-w-2xl mx-auto pb-20 animate-in fade-in duration-500">
      
      {/* Official Announcements Section */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Bell className="w-6 h-6 mr-3 text-primary-600" />
          Annonces Officielles
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Messages importants du comité de pilotage.</p>
      </div>

      <div className="space-y-4 mb-10">
        {notifications.length > 0 ? (
          notifications.map(notif => (
            <div key={notif.id} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border-l-4 border-primary-500 dark:border-primary-600 animate-in slide-in-from-bottom-2 border border-gray-100 dark:border-gray-700 border-l-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{notif.title}</h3>
                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {notif.date}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-line">{notif.message}</p>
              <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3">
                <span className="font-medium text-primary-600 dark:text-primary-400 mr-1">De :</span> {notif.authorName}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">Aucune annonce pour le moment.</p>
          </div>
        )}
      </div>

      {/* Success Stories Section (Moved from Dashboard) */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Trophy className="w-6 h-6 mr-3 text-yellow-500" />
          Dernières Victoires du Cluster
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Célébrons ensemble nos réussites collectives.</p>
      </div>

      <div className="space-y-4">
        {victories.length > 0 ? (
          victories.map(victory => (
            <div key={victory.id} className="relative bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-dark-card p-6 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-900/30 animate-in slide-in-from-bottom-2 overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Trophy className="w-24 h-24 text-yellow-600 dark:text-yellow-500" />
               </div>
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{victory.title}</h3>
                    <span className="text-xs font-bold bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded-full">
                      {victory.date}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-300 font-medium leading-relaxed">{victory.description}</p>
               </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">Aucune victoire publiée pour l'instant.</p>
          </div>
        )}
      </div>

    </div>
  );
};