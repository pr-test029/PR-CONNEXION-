import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Trophy, Medal, User, Loader2 } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await storageService.getLeaderboard();
        setLeaderboard(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard', error);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
          Classement des Membres
        </h3>
      </div>
      
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {leaderboard.length > 0 ? (
          leaderboard.map((entry, index) => (
            <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-8 text-center font-bold text-gray-400">
                  {index === 0 ? <Medal className="w-6 h-6 text-yellow-500 mx-auto" /> : 
                   index === 1 ? <Medal className="w-6 h-6 text-gray-400 mx-auto" /> :
                   index === 2 ? <Medal className="w-6 h-6 text-amber-600 mx-auto" /> :
                   index + 1}
                </div>
                <img 
                  src={entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}`} 
                  alt={entry.name} 
                  className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700"
                />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{entry.name}</p>
                  <p className="text-xs text-gray-500">Membre Actif</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-primary-600">{entry.total_score}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Points</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Aucun score enregistré pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
