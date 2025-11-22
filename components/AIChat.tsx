
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Bot, MapPin, Search as SearchIcon, Loader2 } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';
import { storageService } from '../services/storageService';
import ReactMarkdown from 'react-markdown';
import { Content } from '@google/genai';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Bonjour ! Je connais tout sur la plateforme : les membres, leurs statistiques, les formations et les activités. Posez-moi une question précise.",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState(''); // Store context
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Generate context only when chat opens or on first load
  useEffect(() => {
    if (isOpen && !context) {
      generateAppContext();
    }
  }, [isOpen]);

  // --- CONTEXT GENERATION ---
  const generateAppContext = async () => {
    try {
      // Use Cached services - these calls are now instant if data is in cache
      const members = await storageService.getAllMembers();
      const trainings = await storageService.getTrainings();
      const posts = await storageService.getPosts();
      const goals = storageService.getStrategicGoals();

      // Format Members Data (Detailed)
      const membersContext = members.map(m => {
        const userPosts = posts.filter(p => p.authorId === m.id).length;
        return `
        - Membre: ${m.name} (ID: ${m.id})
          * Role: ${m.role}
          * Entreprise: ${m.businessName}
          * Secteur: ${m.sector}
          * Ville: ${m.location.city} (${m.location.address})
          * Statut: ${m.status}
          * Progression Formation: ${m.trainingProgress}%
          * Formations Complétées: ${m.completedTrainings.length} / ${trainings.length}
          * Badges: ${m.badges.join(', ')}
          * Nombre de Publications: ${userPosts}
        `.trim();
      }).join('\n');

      // Format Trainings
      const trainingContext = trainings.map(t => 
        `- Formation: "${t.title}" (Type: ${t.type}, Durée: ${t.duration})`
      ).join('\n');

      // Platform Stats
      const statsContext = `
        - Total Membres: ${members.length}
        - Total Formations: ${trainings.length}
        - Total Posts: ${posts.length}
        - Objectifs Stratégiques: ${goals.map(g => g.text + (g.isCompleted ? ' [FAIT]' : '')).join(', ')}
      `;

      const fullContext = `
        STATS GLOBALES:
        ${statsContext}

        LISTE DES MEMBRES:
        ${membersContext}

        FORMATIONS DISPONIBLES:
        ${trainingContext}
      `;

      setContext(fullContext);
    } catch (e) {
      console.error("Error generating AI context", e);
      setContext("Données temporairement indisponibles.");
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Transform internal message format to Gemini Content format
      const history: Content[] = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const result = await sendMessageToGemini(userMessage.text, history, context);
      const responseText = result.text || '';
      
      // Handle grounding metadata if available (for search/maps)
      const groundingMetadata = result.candidates?.[0]?.groundingMetadata;

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        groundingMetadata: groundingMetadata
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Désolé, je rencontre des difficultés pour accéder aux données actuellement. Veuillez réessayer.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-dark-card rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-10 duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-4 flex justify-between items-center text-white">
        <div className="flex items-center space-x-2">
          <div className="bg-white/20 p-1.5 rounded-lg">
             <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
             <h3 className="font-bold text-sm">Assistant Cluster</h3>
             <p className="text-[10px] text-primary-100">Propulsé par Gemini 2.5</p>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-bg/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot className="w-5 h-5 text-primary-600" />
              </div>
            )}
            
            <div className={`
              max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-primary-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700'
              }
            `}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>

              {/* Display Grounding Sources (Search/Maps) */}
              {msg.groundingMetadata?.groundingChunks && (
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                  {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => {
                    if (chunk.web?.uri) {
                       return (
                         <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-blue-500 hover:underline">
                           <SearchIcon className="w-3 h-3 mr-1" /> {chunk.web.title || 'Source Web'}
                         </a>
                       );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-2">
                <Bot className="w-5 h-5 text-primary-600" />
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 flex items-center space-x-2">
                 <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                 <span className="text-xs text-gray-400">Analyse en cours...</span>
              </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Posez une question sur le cluster..."
            className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-full pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white transition-colors"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="absolute right-1.5 top-1.5 bg-primary-600 text-white p-1.5 rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          L'IA peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
};
