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
      text: "Bonjour ! Je suis l'assistant intelligent du Cluster. Je suis connecté en temps réel aux discussions, aux publications et aux données des membres. Comment puis-je vous aider ?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // --- DYNAMIC CONTEXT GENERATION ---
  // This function is called every time a message is sent to ensure real-time data accuracy
  const buildRealTimeContext = async () => {
    try {
      // 1. Fetch Fresh Data
      const members = await storageService.getAllMembers();
      const posts = await storageService.getPosts();
      const trainings = await storageService.getTrainings();
      // Fetch latest 30 messages for context
      const discussions = await storageService.getDiscussionMessages(30); 
      const goals = storageService.getStrategicGoals();
      const notifications = storageService.getNotifications();

      // 2. Creator Info (Powerful Reach)
      const creatorContext = `
      === CRÉATEUR DE LA PLATEFORME ===
      Cette plateforme a été conçue, développée et est maintenue par l'agence digitale "POWERFUL REACH".
      - Identité : Agence de développement digital et d'innovation technologique.
      - Mission : Transformer les visions en solutions numériques performantes.
      - Localisation : Congo-Brazzaville.
      - Contact Email : powerfulreach029@gmail.com / paulndamba2@gmail.com (Chef d'agence)
      - Contact Téléphone : +242 06 769 61 57 / +242 05 013 32 71 (WhatsApp)
      - Responsabilités : Maintenance technique, sécurité des données, mise à jour des fonctionnalités.
      `;

      // 3. Discussion Context (Conversations)
      // We format this so the AI understands what people are talking about right now
      const discussionContext = `
      === DISCUSSIONS RÉCENTES (CHAT GÉNÉRAL - TEMPS RÉEL) ===
      Voici les derniers échanges entre les membres (du plus récent au plus ancien) :
      ${discussions.map(d => `- [${d.displayTime}] ${d.authorName}: "${d.content}"`).join('\n')}
      `;

      // 4. Posts Context (Concerns & Activities)
      const postsContext = `
      === PUBLICATIONS DU FIL D'ACTUALITÉ ===
      Analyse ces posts pour comprendre les besoins et succès actuels :
      ${posts.slice(0, 15).map(p => {
        return `- Post de ${p.authorName} (Type: ${p.type}, ${p.timestamp}):
          Contenu : "${p.content}"
          Engagement : ${p.likes} likes, ${p.comments} commentaires.`;
      }).join('\n')}
      `;

      // 5. Members Detailed Context
      const membersContext = `
      === LISTE DES MEMBRES ===
      ${members.map(m => `
      - ${m.name} (ID: ${m.id})
        * Entreprise : ${m.businessName} (${m.sector})
        * Ville : ${m.location.city}
        * Statut : ${m.status}
        * Badges : ${m.badges.join(', ')}
      `).join('\n')}
      `;

      // 6. Admin & Goals
      const adminContext = `
      === ANNONCES & OBJECTIFS ===
      - Objectifs Stratégiques : ${goals.map(g => g.text + (g.isCompleted ? ' [FAIT]' : ' [EN COURS]')).join(', ')}
      - Dernières Annonces Officielles : ${notifications.slice(0, 3).map(n => n.title + ': ' + n.message).join(' | ')}
      `;

      const fullContext = `
        DATE ET HEURE ACTUELLE : ${new Date().toLocaleString('fr-FR')}

        ${creatorContext}
        ${adminContext}
        ${discussionContext}
        ${postsContext}
        ${membersContext}
        
        === INSTRUCTIONS SPÉCIFIQUES ===
        1. Tu as accès aux discussions en temps réel ci-dessus. Si on te demande "De quoi parlent les gens ?", résume la section DISCUSSIONS RÉCENTES.
        2. Si on te demande qui a créé l'application, réfère-toi TOUJOURS à "POWERFUL REACH" avec les détails fournis.
        3. Sois proactif : si un membre a posé une question dans le chat ou un post sans réponse, suggère une solution.
      `;

      return fullContext;

    } catch (e) {
      console.error("Error generating AI context", e);
      return "Données temporairement indisponibles.";
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
      // BUILD CONTEXT RIGHT NOW (Real-time)
      const dynamicContext = await buildRealTimeContext();

      // Transform internal message format to Gemini Content format
      const history: Content[] = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const result = await sendMessageToGemini(userMessage.text, history, dynamicContext);
      const responseText = result.text || '';
      
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
    <div className={`
      fixed z-[60] flex flex-col bg-white dark:bg-dark-card shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-10 duration-300 rounded-2xl
      
      /* Mobile Layout: Floating Pop-up */
      w-[calc(100%-32px)] h-[65vh] bottom-24 left-4 right-4
      
      /* Desktop Layout */
      md:w-96 md:h-[600px] md:bottom-28 md:right-6 md:left-auto md:bottom-auto
    `}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-4 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center space-x-2">
          <div className="bg-white/20 p-1.5 rounded-lg">
             <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
             <h3 className="font-bold text-sm">Assistant Cluster</h3>
             <p className="text-[10px] text-primary-100">En direct • Analyse Temps Réel</p>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
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
                 <span className="text-xs text-gray-400">Analyse des données en cours...</span>
              </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-gray-700 shrink-0">
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
          L'IA analyse les conversations et les posts en temps réel.
        </p>
      </div>
    </div>
  );
};
