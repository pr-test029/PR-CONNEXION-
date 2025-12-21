
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { DiscussionMessage, Member } from '../types';
import { Send, Lock, MessageSquare, Loader2, Trash2 } from 'lucide-react';

export const GeneralDiscussion: React.FC<{currentUser: Member | null}> = ({currentUser}) => {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 15;

  useEffect(() => {
    if (currentUser) {
      loadInitialMessages();
    }
  }, [currentUser]);

  const loadInitialMessages = async () => {
    setLoading(true);
    try {
      const data = await storageService.getDiscussionMessages(PAGE_SIZE);
      setMessages(data);
      if (data.length < PAGE_SIZE) setHasMore(false);
      
      // Scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
    } catch (e) {
      console.error("Erreur Neon:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const container = chatContainerRef.current;
    const oldScrollHeight = container?.scrollHeight || 0;

    try {
      const oldest = messages[0];
      const more = await storageService.getDiscussionMessages(PAGE_SIZE, oldest.timestamp);
      if (more.length < PAGE_SIZE) setHasMore(false);
      
      if (more.length > 0) {
        setMessages(prev => [...more, ...prev]);
        setTimeout(() => {
          if (container) container.scrollTop = container.scrollHeight - oldScrollHeight;
        }, 0);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage.trim();
    setNewMessage('');
    
    try {
      const added = await storageService.addDiscussionMessage({
        authorId: currentUser.id,
        content: content
      });
      setMessages(prev => [...prev, added]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      alert("Erreur base de données Neon.");
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessageId) return;
    try {
      await storageService.deleteDiscussionMessage(selectedMessageId);
      setMessages(prev => prev.filter(m => m.id !== selectedMessageId));
      setSelectedMessageId(null);
    } catch (e) {
      alert("Impossible de supprimer.");
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-full mb-6">
          <Lock className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Accès Restreint</h2>
        <p className="text-gray-500 dark:text-gray-400">Connectez-vous pour accéder au chat membre (Neon DB).</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          <h2 className="font-bold text-gray-900 dark:text-white">Discussion Générale (Neon)</h2>
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop === 0) loadMoreMessages();
        }}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-bg/30"
      >
        {loadingMore && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary-400" /></div>}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.authorId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  onContextMenu={(e) => {
                    if(isMe) {
                      e.preventDefault();
                      setSelectedMessageId(msg.id);
                    }
                  }}
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                    isMe ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                  }`}
                >
                  {!isMe && <p className="font-bold text-[10px] text-primary-700 dark:text-primary-400 uppercase mb-0.5">{msg.authorName}</p>}
                  <p>{msg.content}</p>
                  <p className="text-[9px] mt-1 text-right opacity-60">{msg.displayTime}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex space-x-2">
          <input 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Écrivez votre message..." 
            className="flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
          <button onClick={handleSendMessage} className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
            <Send className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {selectedMessageId && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-2xl max-w-xs w-full mx-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Supprimer le message ?</h3>
            <div className="flex space-x-3">
              <button onClick={() => setSelectedMessageId(null)} className="flex-1 py-2 text-gray-600 dark:text-gray-400">Annuler</button>
              <button onClick={handleDeleteMessage} className="flex-1 py-2 bg-red-600 text-white rounded-lg"><Trash2 className="w-4 h-4 inline mr-1" /> Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
