import React, { useState, useRef, useEffect } from 'react';
import { Member, TrainingResource, TrainingType } from '../types';
import { storageService } from '../services/storageService';
import { 
  FileText, 
  Video, 
  Mic, 
  Link as LinkIcon, 
  FileType2, 
  Plus, 
  X, 
  Eye,
  Upload,
  Download,
  ExternalLink,
  Lock
} from 'lucide-react';

export const Training: React.FC<{currentUser: Member | null}> = ({currentUser}) => {

  // --- GUEST ACCESS RESTRICTION ---
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in duration-500">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6 shadow-sm">
          <Lock className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Contenu Réservé aux Membres</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
          L'accès au centre de formation et aux ressources pédagogiques est exclusivement réservé aux membres connectés du Cluster.
        </p>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-w-sm w-full">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Déjà membre ?</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Utilisez le bouton "Se connecter" dans le menu.</p>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED CONTENT BELOW ---

  const [trainings, setTrainings] = useState<TrainingResource[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingResource, setViewingResource] = useState<TrainingResource | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('Tous');

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<TrainingType>('PDF');
  const [newLink, setNewLink] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageService.getTrainings().then(setTrainings);
  }, []);

  // Helper to ensure URLs are absolute for external links
  const formatUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddTraining = async () => {
    if (!newTitle || (!selectedFile && !newLink) || !currentUser) return;

    let resourceUrl = '';
    
    if (newType === 'LINK') {
      resourceUrl = formatUrl(newLink);
    } else if (selectedFile) {
      resourceUrl = URL.createObjectURL(selectedFile);
    }

    const newTraining: TrainingResource = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDescription,
      type: newType,
      url: resourceUrl,
      dateAdded: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
      authorName: currentUser.name,
      duration: selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Lien externe'
    };

    try {
        await storageService.addTraining(newTraining);
        const updated = await storageService.getTrainings();
        setTrainings(updated);
        closeUploadModal();
    } catch (error: any) {
        alert(error.message || "Erreur lors de l'ajout de la formation.");
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewType('PDF');
    setNewLink('');
    setSelectedFile(null);
  };

  const handleOpenResource = (resource: TrainingResource) => {
      // Mark as completed
      if (currentUser) {
          storageService.markTrainingCompleted(currentUser.id, resource.id);
      }
      
      // Logic for opening/viewing
      if (resource.type === 'LINK') {
          window.open(formatUrl(resource.url), '_blank');
      } else {
          setViewingResource(resource);
      }
  };

  const getIconForType = (type: TrainingType) => {
    switch (type) {
      case 'VIDEO': return <Video className="w-6 h-6 text-red-500" />;
      case 'AUDIO': return <Mic className="w-6 h-6 text-purple-500" />;
      case 'PDF': return <FileText className="w-6 h-6 text-red-600" />;
      case 'WORD': return <FileType2 className="w-6 h-6 text-blue-600" />;
      case 'LINK': return <LinkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
      default: return <FileText className="w-6 h-6 text-gray-500" />;
    }
  };

  const renderViewerContent = (resource: TrainingResource) => {
    const formattedUrl = formatUrl(resource.url);

    switch (resource.type) {
      case 'VIDEO':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <video controls className="w-full max-h-[80vh] rounded shadow-lg" src={formattedUrl}>
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        );
      case 'AUDIO':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-10 rounded-lg">
            <div className="w-32 h-32 bg-primary-100 rounded-full flex items-center justify-center mb-8 animate-pulse">
              <Mic className="w-16 h-16 text-primary-600" />
            </div>
            <h3 className="text-white text-xl font-bold mb-4">{resource.title}</h3>
            <audio controls className="w-full max-w-md" src={formattedUrl}>
              Votre navigateur ne supporte pas l'élément audio.
            </audio>
          </div>
        );
      case 'PDF':
        return (
          <div className="w-full h-full bg-gray-200 rounded-lg overflow-hidden flex flex-col">
            <object data={formattedUrl} type="application/pdf" className="w-full h-full flex-1">
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                 <FileText className="w-16 h-16 text-gray-400 mb-4" />
                 <p className="text-gray-700 font-medium mb-2">L'aperçu direct n'est pas disponible.</p>
                 <a 
                  href={formattedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                 >
                   Télécharger le PDF
                 </a>
              </div>
            </object>
          </div>
        );
      case 'WORD':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white p-8 text-center">
            <FileType2 className="w-24 h-24 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">{resource.title}</h3>
            <p className="text-gray-500 mb-6 max-w-md">
              La visualisation directe des documents Word n'est pas supportée par tous les navigateurs.
            </p>
            <a 
              href={formattedUrl} 
              download={resource.title}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
            >
              <Download className="w-5 h-5 mr-2" />
              Télécharger le fichier
            </a>
          </div>
        );
      case 'LINK':
        return (
          <div className="w-full h-full flex flex-col bg-white dark:bg-dark-card">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-2xl">{formattedUrl}</span>
                <a 
                  href={formattedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ouvrir dans un nouvel onglet</span>
                </a>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 relative">
               <iframe 
                src={formattedUrl} 
                className="w-full h-full border-0" 
                title="External Link Viewer"
                sandbox="allow-scripts allow-same-origin allow-forms"
               />
               <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center p-10 text-center">
                  <LinkIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Chargement de la page...</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Si rien ne s'affiche, le site bloque l'intégration. Utilisez le bouton ci-dessus.</p>
               </div>
            </div>
          </div>
        );
      default:
        return <p>Format non supporté</p>;
    }
  };

  const filters = ['Tous', 'VIDEO', 'AUDIO', 'PDF', 'WORD', 'LINK'];
  
  const filteredTrainings = activeFilter === 'Tous' 
    ? trainings 
    : trainings.filter(t => t.type === activeFilter);

  return (
    <div className="space-y-6 pb-20 relative">
      
      {/* Header & Actions */}
      <div className="flex flex-col space-y-4 bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Centre de Ressources</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Formations, guides et outils pour votre développement</p>
          </div>
          {currentUser && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Importer une formation</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide border-t border-gray-100 dark:border-gray-700 pt-4">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all ${
                  activeFilter === filter 
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500' 
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {filter}
              </button>
            ))}
        </div>
      </div>

      {/* Training Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrainings.length === 0 ? (
           <div className="col-span-full text-center py-12 bg-white dark:bg-dark-card rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-400">Aucune formation trouvée dans cette catégorie.</p>
           </div>
        ) : (
          filteredTrainings.map((resource) => (
            <div 
              key={resource.id} 
              className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all group flex flex-col h-full"
            >
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-800`}>
                    {getIconForType(resource.type)}
                  </div>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {resource.type}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {resource.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {resource.description}
                </p>
                <div className="text-xs text-gray-400 dark:text-gray-500 flex justify-between items-center border-t border-gray-50 dark:border-gray-800 pt-3">
                  <span>Ajouté par {resource.authorName}</span>
                  <span>{resource.dateAdded}</span>
                </div>
              </div>
              <button 
                onClick={() => handleOpenResource(resource)}
                className="w-full bg-gray-50 dark:bg-gray-800 p-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors flex items-center justify-center border-t border-gray-100 dark:border-gray-700"
              >
                {resource.type === 'LINK' ? (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" /> Ouvrir
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" /> Visionner / Lire
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Formation</h3>
              <button onClick={closeUploadModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Titre de la formation</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                  placeholder="Ex: Guide de gestion..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Description</label>
                <textarea 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                  rows={3}
                  placeholder="Décrivez le contenu..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">Type de contenu</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PDF', 'VIDEO', 'AUDIO', 'WORD', 'LINK'] as TrainingType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setNewType(type)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        newType === type 
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-400' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {newType === 'LINK' ? 'Lien vers la ressource' : 'Fichier à importer'}
                </label>
                {newType === 'LINK' ? (
                  <input 
                    type="url" 
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                    placeholder="https://..."
                  />
                ) : (
                  <div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-300 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      {selectedFile ? selectedFile.name : "Cliquez pour sélectionner un fichier"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF, MP4, MP3, DOCX supportés</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept={
                        newType === 'PDF' ? '.pdf' : 
                        newType === 'VIDEO' ? 'video/*' : 
                        newType === 'AUDIO' ? 'audio/*' : 
                        newType === 'WORD' ? '.doc,.docx' : '*'
                      }
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end space-x-3">
              <button 
                onClick={closeUploadModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleAddTraining}
                disabled={!newTitle || (!selectedFile && !newLink)}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Publier la formation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewingResource && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card w-full h-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  {getIconForType(viewingResource.type)}
                </div>
                <div>
                   <h3 className="font-bold text-lg">{viewingResource.title}</h3>
                   <p className="text-xs text-gray-300">{viewingResource.type} • {viewingResource.duration}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingResource(null)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto relative flex items-center justify-center">
               {renderViewerContent(viewingResource)}
            </div>
            
            <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-gray-700 shrink-0">
              <p className="text-sm text-gray-600 dark:text-gray-300">{viewingResource.description}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};