import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { StrategicGoal, Notification, ClusterVictory, Member, Post } from '../types';
import { Bell, Send, CheckCircle, Plus, Trash2, Target, ShieldAlert, Trophy, Edit2, Save, X, Lock, MessageSquare, AlertOctagon, Loader2 } from 'lucide-react';

export const AdminPanel: React.FC<{currentUser: Member | null}> = ({currentUser}) => {

  // Notification State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  
  // Goals State
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  
  // Victories State
  const [victories, setVictories] = useState<ClusterVictory[]>([]);
  const [newVictoryTitle, setNewVictoryTitle] = useState('');
  const [newVictoryDesc, setNewVictoryDesc] = useState('');
  const [editingVictoryId, setEditingVictoryId] = useState<string | null>(null);

  // Posts Moderation State
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
        setGoals(storageService.getStrategicGoals());
        setVictories(storageService.getVictories());
        
        setLoadingPosts(true);
        storageService.getPosts()
          .then(setAllPosts)
          .catch(err => console.error("Failed to load posts for moderation", err))
          .finally(() => setLoadingPosts(false));
    }
  }, [currentUser]);

  // --- ACCESS CONTROL ---
  if (!currentUser || currentUser.role !== 'ADMIN') {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-in fade-in duration-500">
              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-4">
                  <Lock className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accès Refusé</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  Cette section est réservée aux administrateurs du Cluster. Veuillez vous connecter avec un compte autorisé.
              </p>
          </div>
      );
  }

  // --- NOTIFICATIONS HANDLERS ---
  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    const newNotif: Notification = {
      id: Date.now().toString(),
      title,
      message,
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      authorName: currentUser?.name || 'Administration'
    };

    storageService.addNotification(newNotif);
    setTitle('');
    setMessage('');
    setSuccessMsg('Notification envoyée à tous les membres avec succès !');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- GOALS HANDLERS ---
  const handleAddGoal = () => {
    if (!newGoalText.trim()) return;
    const updatedGoals = storageService.addStrategicGoal(newGoalText);
    setGoals(updatedGoals);
    setNewGoalText('');
  };

  const handleToggleGoal = (id: string) => {
    const updatedGoals = storageService.toggleStrategicGoal(id);
    setGoals(updatedGoals);
  };

  const handleDeleteGoal = (id: string) => {
    const updatedGoals = storageService.deleteStrategicGoal(id);
    setGoals(updatedGoals);
  };

  // --- VICTORIES HANDLERS ---
  const handleSaveVictory = () => {
    if (!newVictoryTitle.trim() || !newVictoryDesc.trim()) return;

    if (editingVictoryId) {
        // Update
        const updatedList = storageService.updateVictory(editingVictoryId, {
            title: newVictoryTitle,
            description: newVictoryDesc
        });
        setVictories(updatedList);
        setEditingVictoryId(null);
        setSuccessMsg('Victoire modifiée avec succès !');
    } else {
        // Create
        const newVictory: ClusterVictory = {
            id: Date.now().toString(),
            title: newVictoryTitle,
            description: newVictoryDesc,
            date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
        };
        const updatedList = storageService.addVictory(newVictory);
        setVictories(updatedList);
        setSuccessMsg('Victoire ajoutée avec succès !');
    }
    
    setNewVictoryTitle('');
    setNewVictoryDesc('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEditVictory = (victory: ClusterVictory) => {
      setEditingVictoryId(victory.id);
      setNewVictoryTitle(victory.title);
      setNewVictoryDesc(victory.description);
  };

  const handleCancelEditVictory = () => {
      setEditingVictoryId(null);
      setNewVictoryTitle('');
      setNewVictoryDesc('');
  };

  const handleDeleteVictory = (id: string) => {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette victoire ?')) {
          const updatedList = storageService.deleteVictory(id);
          setVictories(updatedList);
      }
  };

  // --- POST MODERATION HANDLER ---
  const handleDeletePost = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette publication de manière définitive ? Cette action est irréversible.")) {
      try {
        await storageService.deletePost(id);
        
        // Update local state immediately to remove the deleted post
        setAllPosts(prev => prev.filter(p => p.id !== id));
        
        // Show success message
        setSuccessMsg('Publication supprimée avec succès.');
        setTimeout(() => setSuccessMsg(''), 3000);
        
      } catch (error: any) {
        console.error("Deletion failed", error);
        setErrorMsg(`Erreur lors de la suppression : ${error.message}`);
        setTimeout(() => setErrorMsg(''), 5000);
        alert(`Impossible de supprimer la publication : ${error.message}`);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl shadow-lg text-white flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold flex items-center">
             <ShieldAlert className="w-6 h-6 mr-3 text-red-500" />
             Administration du Cluster
           </h2>
           <p className="text-gray-400 text-sm mt-1">Espace réservé au comité de pilotage et administrateurs.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative animate-in fade-in slide-in-from-top-2">
          <strong className="font-bold">Succès! </strong>
          <span className="block sm:inline">{successMsg}</span>
        </div>
      )}
      
      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative animate-in fade-in slide-in-from-top-2">
          <strong className="font-bold">Erreur! </strong>
          <span className="block sm:inline">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Send Notification Section */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-primary-600" />
            Envoyer une Annonce Globale
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Ce message déclenchera une notification pour tous les membres via l'icône cloche.
          </p>
          
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sujet de l'annonce</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                placeholder="Ex: Réunion mensuelle..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message détaillé</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 h-32 resize-none dark:text-white"
                placeholder="Votre message ici..."
              />
            </div>
            <button 
              type="submit" 
              disabled={!title || !message}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer à tous
            </button>
          </form>
        </div>

        {/* Strategic Goals Management */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            Cap Stratégique 2026
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Gérez les objectifs du cluster. Cochez pour mettre à jour la progression sur le tableau de bord.
          </p>

          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {goals.map(goal => (
              <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                 <div className="flex items-center space-x-3 flex-1">
                    <button 
                      onClick={() => handleToggleGoal(goal.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        goal.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {goal.isCompleted && <CheckCircle className="w-3 h-3" />}
                    </button>
                    <span className={`text-sm ${goal.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                      {goal.text}
                    </span>
                 </div>
                 <button 
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            ))}
          </div>

          <div className="flex space-x-2">
            <input 
              type="text" 
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              placeholder="Nouvel objectif..."
            />
            <button 
              onClick={handleAddGoal}
              disabled={!newGoalText.trim()}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* POST MODERATION */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertOctagon className="w-5 h-5 mr-2 text-orange-500" />
            Modération des Publications
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Consultez les publications récentes et supprimez celles qui ne respectent pas la charte du Cluster.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar">
             {loadingPosts ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
             ) : allPosts.length === 0 ? (
               <p className="text-center text-gray-400 py-10">Aucune publication à afficher.</p>
             ) : (
               allPosts.map(post => (
                 <div key={post.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex justify-between items-start">
                    <div className="flex-1 pr-4">
                       <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-bold text-gray-800 dark:text-white">{post.authorName}</span>
                          <span className="text-[10px] text-gray-400">• {post.timestamp}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">{post.type}</span>
                       </div>
                       <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{post.content}</p>
                       {post.image && (
                         <div className="flex items-center mt-2 text-xs text-blue-500">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span> Image jointe
                         </div>
                       )}
                    </div>
                    <button 
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex-shrink-0"
                      title="Supprimer cette publication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* CLUSTER VICTORIES MANAGEMENT */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Gestion des Victoires du Cluster
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Ajoutez ici les succès majeurs qui seront affichés dans la section "Annonces" pour motiver la communauté.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form */}
              <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                      <h4 className="font-bold text-sm text-yellow-800 dark:text-yellow-500 mb-3">
                          {editingVictoryId ? 'Modifier la victoire' : 'Ajouter une nouvelle victoire'}
                      </h4>
                      <div className="space-y-3">
                          <input 
                            type="text" 
                            value={newVictoryTitle}
                            onChange={(e) => setNewVictoryTitle(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-900/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 dark:text-white"
                            placeholder="Titre (ex: Financement obtenu)"
                          />
                          <textarea 
                            value={newVictoryDesc}
                            onChange={(e) => setNewVictoryDesc(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-900/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 h-20 resize-none dark:text-white"
                            placeholder="Détails de la réussite..."
                          />
                          <div className="flex space-x-2">
                              <button 
                                onClick={handleSaveVictory}
                                disabled={!newVictoryTitle.trim() || !newVictoryDesc.trim()}
                                className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                {editingVictoryId ? 'Mettre à jour' : 'Enregistrer'}
                              </button>
                              {editingVictoryId && (
                                  <button 
                                    onClick={handleCancelEditVictory}
                                    className="px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>

              {/* List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {victories.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-10">Aucune victoire enregistrée.</p>
                  ) : (
                      victories.map(v => (
                          <div key={v.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-sm transition-shadow relative group">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h5 className="font-bold text-gray-800 dark:text-white text-sm">{v.title}</h5>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{v.description}</p>
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 block">{v.date}</span>
                                  </div>
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleEditVictory(v)}
                                        className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                      >
                                          <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteVictory(v.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
        </div>

      </div>
    </div>
  );
};