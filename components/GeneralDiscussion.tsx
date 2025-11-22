
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { DiscussionMessage, Member } from '../types';
import { Send, Lock, MessageSquare } from 'lucide-react';

export const GeneralDiscussion: React.FC<{currentUser: Member | null}> = ({currentUser}) => {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-blue-50 p-6 rounded-full mb-6"><Lock className="w-12 h-12 text-blue-500" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Accès Restreint</h2>
        <p className="text-gray-500">Connectez-vous pour accéder au chat membre.</p>
      </div>
    );
  }

  const fetchMessages = async () => {
    const data = await storageService.getDiscussionMessages();
    setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Polling for simplicity
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await storageService.addDiscussionMessage({
       authorId: currentUser.id,
       content: newMessage.trim()
    });
    setNewMessage('');
    fetchMessages();
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
           <MessageSquare className="w-5 h-5 text-primary-600" />
           <h2 className="font-bold text-gray-900">Discussion Générale</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8fafc]">
        {messages.map((msg, index) => {
          const isMe = msg.authorId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && <img src={msg.authorAvatar} className="w-8 h-8 rounded-full mr-2 mt-1" alt="Av"/>}
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-primary-600 text-white' : 'bg-white text-gray-800 border'}`}>
                 <p className="font-bold text-[10px] mb-1 opacity-80">{msg.authorName}</p>
                 {msg.content}
                 <p className="text-[9px] mt-1 text-right opacity-70">{msg.displayTime}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex space-x-2">
         <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Message..." className="flex-1 bg-gray-50 border rounded-xl px-4 py-2"/>
         <button onClick={handleSendMessage} className="p-2 bg-primary-600 text-white rounded-lg"><Send className="w-5 h-5"/></button>
      </div>
    </div>
  );
};
