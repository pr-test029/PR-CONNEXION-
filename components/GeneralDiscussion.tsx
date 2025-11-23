import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabaseClient';
import { DiscussionMessage, Member } from '../types';
import { Send, Lock, MessageSquare, Loader2, Trash2, X } from 'lucide-react';

export const GeneralDiscussion: React.FC<{currentUser: Member | null}> = ({currentUser}) => {
  // Initialize with cached messages if available for instant rendering
  const [messages, setMessages] = useState<DiscussionMessage[]>(() => storageService.getCachedMessages());
  const [newMessage, setNewMessage] = useState('');
  
  // Loading States
  const [loading, setLoading] = useState(storageService.getCachedMessages().length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  // Constants
  const PAGE_SIZE = 10;

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-blue-50 p-6 rounded-full mb-6"><Lock className="w-12 h-12 text-blue-500" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Accès Restreint</h2>
        <p className="text-gray-500">Connectez-vous pour accéder au chat membre.</p>
      </div>
    );
  }

  // Initial Fetch (Latest 10)
  const fetchMessages = async () => {
    try {
      // Fetch only the last 10 messages initially for performance
      const data = await storageService.getDiscussionMessages(PAGE_SIZE);
      setMessages(data);
      // If we got fewer than PAGE_SIZE, we know we have no more history
      if (data.length < PAGE_SIZE) setHasMore(false);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load More (Pagination)
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    // Remember scroll position before adding elements
    const container = chatContainerRef.current;
    const oldScrollHeight = container?.scrollHeight || 0;

    try {
      const oldestMessage = messages[0];
      // Fetch older messages using the oldest message's timestamp as cursor
      const moreMessages = await storageService.getDiscussionMessages(PAGE_SIZE, oldestMessage.timestamp);
      
      if (moreMessages.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (moreMessages.length > 0) {
        // Prepend old messages
        setMessages(prev => [...moreMessages, ...prev]);
        
        // Restore scroll position immediately after render
        // We use setTimeout to ensure it runs after DOM update, 
        // though useLayoutEffect is often cleaner if we split the logic.
        // Here we do it manually in the success block.
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
          }
        }, 0);
      }
    } catch (error) {
      console.error("Error loading more messages", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Realtime Subscription
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new;
          
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;

            storageService.getAllMembers().then(members => {
               const author = members.find(m => m.id === newMsg.author_id);
               const authorName = author?.name || 'Membre';
               const authorAvatar = author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`;

               const formattedMsg: DiscussionMessage = {
                 id: newMsg.id,
                 authorId: newMsg.author_id,
                 authorName: authorName,
                 authorAvatar: authorAvatar,
                 content: newMsg.content,
                 timestamp: newMsg.created_at,
                 displayTime: new Date(newMsg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
               };
               
               setMessages(current => {
                 if (current.some(m => m.id === formattedMsg.id)) return current;
                 const updated = [...current, formattedMsg];
                 storageService.syncMessageCache(updated);
                 return updated;
               });
               
               // Auto-scroll to bottom on new message if we are already near bottom
               if (chatContainerRef.current) {
                  const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
                  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                  if (isNearBottom) {
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }
               }
            });
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages(prev => {
             const updated = prev.filter(m => m.id !== deletedId);
             storageService.syncMessageCache(updated);
             return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Scroll to trigger Load More
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop } = chatContainerRef.current;
      if (scrollTop === 0 && hasMore && !loadingMore && !loading) {
        loadMoreMessages();
      }
    }
  };

  // Initial Scroll to bottom on load
  useEffect(() => {
    if (!loading && messages.length > 0 && !loadingMore) {
        // Only auto-scroll to bottom on initial load, not when loading previous messages
        // We check if we have just loaded the initial set or posted a new message
        // This logic is slightly loose but 'loadingMore' flag protects pagination scroll
        if (messages.length <= PAGE_SIZE + 1) { // roughly check if it's the first batch
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }
    }
  }, [loading]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage(''); 
    
    try {
      const addedMsg = await storageService.addDiscussionMessage({
         authorId: currentUser.id,
         content: content
      });

      setMessages(prev => {
          const updated = [...prev, addedMsg];
          storageService.syncMessageCache(updated);
          return updated;
      });
      // Scroll to bottom explicitly
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      
    } catch (error) {
      console.error("Failed to send message", error);
      alert("Erreur lors de l'envoi du message.");
      setNewMessage(content); 
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessageId) return;
    const idToDelete = selectedMessageId;
    const messageToDelete = messages.find(m => m.id === idToDelete);
    
    setSelectedMessageId(null); 

    setMessages(prev => {
        const updated = prev.filter(m => m.id !== idToDelete);
        storageService.syncMessageCache(updated);
        return updated;
    });

    try {
      await storageService.deleteDiscussionMessage(idToDelete);
    } catch (error: any) {
      const errorMessage = error?.message || "Erreur inconnue";
      alert(`Impossible de supprimer ce message. Détails: ${errorMessage}`);
      
      if (messageToDelete) {
        setMessages(prev => {
           const restored = [...prev, messageToDelete].sort((a, b) => 
             new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
           );
           storageService.syncMessageCache(restored);
           return restored;
        });
      }
    }
  };

  // Long Press Handlers
  const handleTouchStart = (msgId: string, authorId: string) => {
    if (authorId !== currentUser.id) return;
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectedMessageId(msgId);
    }, 600); 
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleMouseDown = (msgId: string, authorId: string) => {
    if (authorId !== currentUser.id) return;
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectedMessageId(msgId);
    }, 600);
  };

  const handleMouseUp = () => {
     if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
           <div className="bg-primary-100 p-2 rounded-lg">
             <MessageSquare className="w-5 h-5 text-primary-600" />
           </div>
           <div>
             <h2 className="font-bold text-gray-900 leading-tight">Discussion Générale</h2>
             <p className="text-xs text-gray-500">Maintenez appuyé sur vos messages pour les supprimer.</p>
           </div>
        </div>
        <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">En direct</span>
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8fafc]"
      >
        {loadingMore && (
           <div className="flex justify-center py-2">
             <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
           </div>
        )}

        {loading ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-2" />
                <span className="text-xs">Chargement des discussions...</span>
            </div>
        ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                <MessageSquare className="w-12 h-12 mb-2" />
                <p>Aucun message pour le moment.</p>
                <p className="text-sm">Soyez la première à écrire !</p>
            </div>
        ) : (
            messages.map((msg, index) => {
              const isMe = msg.authorId === currentUser.id;
              const isSequence = index > 0 && messages[index - 1].authorId === msg.authorId;

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-4'}`}>
                  {!isMe && !isSequence && (
                    <img src={msg.authorAvatar} className="w-8 h-8 rounded-full mr-2 mt-1 shadow-sm object-cover border border-white" alt={msg.authorName} title={msg.authorName}/>
                  )}
                  {!isMe && isSequence && <div className="w-10" />} 
                  
                  <div 
                    onTouchStart={() => handleTouchStart(msg.id, msg.authorId)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleMouseDown(msg.id, msg.authorId)}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    
                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm transition-all hover:shadow-md cursor-pointer select-none active:scale-95 duration-200 ${
                      isMe 
                        ? 'bg-primary-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                  }`}>
                     {!isMe && !isSequence && (
                         <p className="font-bold text-[10px] mb-0.5 text-primary-700 uppercase tracking-wide">{msg.authorName}</p>
                     )}
                     <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                     <p className={`text-[9px] mt-1 text-right font-medium ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                         {msg.displayTime}
                     </p>
                  </div>
                </div>
              );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
         <div className="flex space-x-2 relative">
           <input 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
              placeholder="Écrivez votre message..." 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-primary-500 transition-all dark:text-gray-900"
           />
           <button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim()}
              className="absolute right-2 top-1.5 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
           >
              <Send className="w-5 h-5"/>
           </button>
         </div>
      </div>

      {selectedMessageId && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
           <div className="bg-white rounded-xl p-6 shadow-2xl max-w-xs w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer le message ?</h3>
              <p className="text-sm text-gray-500 mb-6">Cette action est irréversible et le message sera effacé pour tout le monde.</p>
              <div className="flex space-x-3">
                 <button 
                   onClick={() => setSelectedMessageId(null)}
                   className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                 >
                   Annuler
                 </button>
                 <button 
                   onClick={handleDeleteMessage}
                   className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex justify-center items-center shadow-md"
                 >
                   <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};