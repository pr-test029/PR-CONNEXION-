
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Heart, Share2, Send, Image as ImageIcon, X, UserCircle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Post, Comment, Member } from '../types';
import { storageService } from '../services/storageService';

interface FeedProps {
  onAuthorClick?: (authorId: string) => void;
  currentUser: Member | null;
}

export const Feed: React.FC<FeedProps> = ({ onAuthorClick, currentUser }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<Post['type']>('Partage');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [visibleComments, setVisibleComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [commentsData, setCommentsData] = useState<{[postId: string]: Comment[]}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [visitorId] = useState(() => {
    if (typeof window !== 'undefined') {
      let vid = localStorage.getItem('pr_visitor_id');
      if (!vid) {
        vid = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('pr_visitor_id', vid);
      }
      return vid;
    }
    return 'unknown_visitor';
  });

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storageService.getPosts();
      setPosts(data);
    } catch (err: any) {
      console.error("Fetch posts error", err);
      setError("Erreur de base de données. Veuillez rafraîchir la page.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadPosts();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!newPostContent.trim() || !currentUser) return;

    const newPost: Post = {
      id: '',
      authorId: currentUser.id,
      content: newPostContent,
      type: newPostType,
      likes: 0,
      comments: 0,
      timestamp: '',
      image: selectedImage || undefined,
      likedBy: [],
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar
    };

    try {
        await storageService.addPost(newPost);
        setNewPostContent('');
        setSelectedImage(null);
        loadPosts(); 
    } catch (error: any) {
        alert(`Erreur lors de la publication : ${error.message}`);
    }
  };

  const handleLike = async (post: Post) => {
    const userId = currentUser?.id || visitorId;
    let isLiked = (post.likedBy || []).includes(userId);
    
    let newLikedBy = [...(post.likedBy || [])];
    if (isLiked) {
        newLikedBy = newLikedBy.filter(id => id !== userId);
    } else {
        newLikedBy.push(userId);
    }
    
    const newCount = isLiked ? Math.max(0, post.likes - 1) : post.likes + 1;
    const updatedPost = { ...post, likes: newCount, likedBy: newLikedBy };
    
    setPosts(posts.map(p => p.id === post.id ? updatedPost : p));

    try {
      await storageService.updatePost(updatedPost);
    } catch (error: any) {
      console.warn("Like update failed:", error.message);
    }
  };

  const toggleComments = async (postId: string) => {
    const newSet = new Set(visibleComments);
    if (newSet.has(postId)) {
      newSet.delete(postId);
    } else {
      newSet.add(postId);
      try {
        const comments = await storageService.getCommentsForPost(postId);
        setCommentsData(prev => ({...prev, [postId]: comments}));
      } catch (e: any) {
        console.error("Failed loading comments", e);
      }
    }
    setVisibleComments(newSet);
  };

  const submitComment = async (postId: string) => {
    if (!currentUser) return;

    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    try {
      await storageService.addComment(postId, text, currentUser.id);
      const updatedComments = await storageService.getCommentsForPost(postId);
      setCommentsData(prev => ({...prev, [postId]: updatedComments}));
      setPosts(prevPosts => 
        prevPosts.map(p => p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p)
      );
    } catch (error: any) {
      alert(`Échec : ${error.message}`);
      setCommentInputs(prev => ({ ...prev, [postId]: text }));
    }
  };

  const filters = ['Tous', 'Besoins', 'Succès', 'Partages', 'Questions'];
  const filterMapping: { [key: string]: string } = {
    'Besoins': 'Besoin', 'Succès': 'Succès', 'Partages': 'Partage', 'Questions': 'Question'
  };

  const filteredPosts = activeFilter === 'Tous' 
    ? posts 
    : posts.filter(post => post.type === filterMapping[activeFilter]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Indicateur de statut de connexion */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Connecté au Cluster (SQLite)
          </div>
        </div>
      </div>

      {currentUser ? (
        <div className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex space-x-4">
            <img src={currentUser.avatar} alt="My Avatar" className="w-10 h-10 rounded-full border-2 border-primary-100 flex-shrink-0 object-cover"/>
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`Bonjour ${currentUser.name.split(' ')[0]}, partagez quelque chose...`}
                className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 dark:text-white resize-none"
                rows={3}
              />
              {selectedImage && (
                <div className="relative mt-2 inline-block">
                  <img src={selectedImage} alt="Preview" className="h-32 w-auto rounded-lg object-cover" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
              <div className="flex justify-between items-center mt-3 gap-3">
                <div className="flex items-center space-x-3">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
                  <select value={newPostType} onChange={(e) => setNewPostType(e.target.value as Post['type'])} className="text-sm bg-gray-50 dark:bg-gray-800 rounded-lg border-gray-200 dark:border-gray-700 py-1.5 px-3 dark:text-white">
                    <option value="Partage">Partage</option>
                    <option value="Besoin">Besoin</option>
                    <option value="Succès">Succès</option>
                    <option value="Question">Question</option>
                  </select>
                </div>
                <button onClick={handlePublish} disabled={!newPostContent.trim()} className="bg-primary-600 text-white px-6 py-2 rounded-full font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2">
                  <span>Publier</span> <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCircle className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-blue-700 dark:text-blue-300">Connectez-vous pour interagir avec les autres membres.</p>
          </div>
        </div>
      )}

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map(filter => (
          <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeFilter === filter ? 'bg-primary-600 text-white shadow-md' : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-gray-800 dark:text-white font-medium">{error}</p>
            <button onClick={loadPosts} className="mt-4 text-primary-600 hover:underline text-sm">Réessayer</button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-400">Aucune publication.</p>
        </div>
      ) : (
        filteredPosts.map((post) => {
          const userId = currentUser?.id || visitorId;
          const isLiked = (post.likedBy || []).includes(userId);
          const comments = commentsData[post.id] || [];
          
          return (
            <div key={post.id} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={post.authorAvatar || `https://ui-avatars.com/api/?name=User&background=random`} 
                      alt={post.authorName} 
                      className="w-10 h-10 rounded-full border border-gray-200 object-cover cursor-pointer" 
                      onClick={() => onAuthorClick?.(post.authorId)}
                    />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => onAuthorClick?.(post.authorId)}>
                        {post.authorName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{post.timestamp}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${post.type === 'Besoin' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {post.type}
                  </span>
                </div>

                <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line mb-4">{post.content}</p>
                {post.image && <div className="mb-4 -mx-5"><img src={post.image} alt="Post" className="w-full max-h-96 object-cover" /></div>}

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex space-x-6">
                    <button onClick={() => handleLike(post)} className={`flex items-center space-x-2 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /><span>{post.likes}</span>
                    </button>
                    <button onClick={() => toggleComments(post.id)} className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 transition-colors text-sm">
                      <MessageSquare className="w-5 h-5" /><span>{post.comments}</span>
                    </button>
                  </div>
                  <button onClick={() => {
                     if (navigator.share) navigator.share({ title: 'cluster', text: post.content, url: window.location.href });
                     else alert("Lien copié !");
                  }} className="text-gray-400 hover:text-gray-600">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {visibleComments.has(post.id) && (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                    {comments.map(c => (
                      <div key={c.id} className="flex space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-primary-700">
                            {c.authorName.charAt(0)}
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex-1">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{c.authorName}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {currentUser && (
                    <div className="flex space-x-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                          placeholder="Écrire un commentaire..."
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full pl-4 pr-10 py-2 text-sm focus:ring-1 focus:ring-primary-500 outline-none dark:text-white"
                        />
                        <button onClick={() => submitComment(post.id)} className="absolute right-2 top-1.5 text-primary-600 hover:scale-110 transition-transform">
                            <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
