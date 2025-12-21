
import { Member, Post, TrainingResource, Notification, StrategicGoal, ClusterVictory, DiscussionMessage, Comment } from '../types';
import { MOCK_MEMBERS, MOCK_POSTS, MOCK_TRAININGS } from '../constants';

/**
 * SERVICE DE STOCKAGE NEON (Simulation)
 * Dans un environnement de production, ce service communiquerait avec une API 
 * connectée à votre base de données PostgreSQL sur Neon.tech.
 */

// Simulation de la base de données asynchrone (Postgres latency simulation)
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const DB_KEYS = {
  MEMBERS: 'neon_db_members',
  POSTS: 'neon_db_posts',
  TRAININGS: 'neon_db_trainings',
  MESSAGES: 'neon_db_messages',
  COMMENTS: 'neon_db_comments',
  GOALS: 'neon_db_goals',
  VICTORIES: 'neon_db_victories',
  NOTIFS: 'neon_db_notifs',
  SESSION: 'neon_auth_session'
};

// Initialisation de la base de données locale (Neon Initial State)
const initDB = () => {
  if (!localStorage.getItem(DB_KEYS.MEMBERS)) {
    localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify(MOCK_MEMBERS));
  }
  if (!localStorage.getItem(DB_KEYS.POSTS)) {
    localStorage.setItem(DB_KEYS.POSTS, JSON.stringify(MOCK_POSTS));
  }
  if (!localStorage.getItem(DB_KEYS.TRAININGS)) {
    localStorage.setItem(DB_KEYS.TRAININGS, JSON.stringify(MOCK_TRAININGS));
  }
  if (!localStorage.getItem(DB_KEYS.GOALS)) {
    localStorage.setItem(DB_KEYS.GOALS, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.VICTORIES)) {
    localStorage.setItem(DB_KEYS.VICTORIES, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.NOTIFS)) {
    localStorage.setItem(DB_KEYS.NOTIFS, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.MESSAGES)) {
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify([]));
  }
  if (!localStorage.getItem(DB_KEYS.COMMENTS)) {
    localStorage.setItem(DB_KEYS.COMMENTS, JSON.stringify({}));
  }
};

initDB();

export const storageService = {
  
  // --- AUTHENTIFICATION (Simulée pour Neon) ---
  
  getCurrentUser: async (): Promise<Member | null> => {
    await wait(100);
    const sessionUserId = localStorage.getItem(DB_KEYS.SESSION);
    if (!sessionUserId) return null;
    
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    return members.find(m => m.id === sessionUserId) || null;
  },

  login: async (email: string, password: string): Promise<Member | null> => {
    await wait(500);
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    const user = members.find(m => m.email === email && m.password === password);
    
    if (user) {
      localStorage.setItem(DB_KEYS.SESSION, user.id);
      return user;
    }
    throw new Error("Identifiants Neon invalides.");
  },

  // Fix: Added city and address to the userData type to match usage and caller data
  register: async (userData: Partial<Member> & { city?: string; address?: string }): Promise<Member> => {
    await wait(800);
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    
    if (members.some(m => m.email === userData.email)) {
      throw new Error("Cet email est déjà utilisé dans la base Neon.");
    }

    const newMember: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: userData.name || 'Inconnu',
      email: userData.email,
      password: userData.password,
      businessName: userData.businessName || '',
      sector: userData.sector || 'Autre',
      location: {
        lat: -4.4419 + (Math.random() - 0.5) * 0.1,
        lng: 15.2663 + (Math.random() - 0.5) * 0.1,
        city: userData.city || 'Kinshasa',
        address: userData.address || 'Non spécifiée'
      },
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random`,
      joinedDate: new Date().toISOString(),
      status: 'En Formation',
      trainingProgress: 0,
      badges: ['Nouveau'],
      role: userData.role || 'MEMBER',
      completedTrainings: []
    };

    const updatedMembers = [...members, newMember];
    localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify(updatedMembers));
    localStorage.setItem(DB_KEYS.SESSION, newMember.id);
    
    return newMember;
  },

  logout: async () => {
    localStorage.removeItem(DB_KEYS.SESSION);
  },

  // --- POSTS (CRUD) ---

  getPosts: async (): Promise<Post[]> => {
    await wait(300);
    const posts: Post[] = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    
    // Enrichissement des données (Join profiles)
    return posts.map(p => {
      const author = members.find(m => m.id === p.authorId);
      return {
        ...p,
        authorName: author?.name || p.authorName || 'Anonyme',
        authorAvatar: author?.avatar || p.authorAvatar || ''
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  addPost: async (post: Post): Promise<void> => {
    await wait(400);
    const posts: Post[] = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    
    const newPost = {
      ...post,
      id: 'neon_post_' + Date.now(),
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(DB_KEYS.POSTS, JSON.stringify([newPost, ...posts]));
  },

  deletePost: async (postId: string): Promise<void> => {
    await wait(500);
    const posts: Post[] = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    
    // Suppression stricte et définitive
    const filteredPosts = posts.filter(p => p.id !== postId);
    
    if (filteredPosts.length === posts.length) {
       throw new Error("Publication introuvable dans la base de données Neon.");
    }
    
    localStorage.setItem(DB_KEYS.POSTS, JSON.stringify(filteredPosts));
    
    // Nettoyage des commentaires associés
    const allComments = JSON.parse(localStorage.getItem(DB_KEYS.COMMENTS) || '{}');
    if (allComments[postId]) {
      delete allComments[postId];
      localStorage.setItem(DB_KEYS.COMMENTS, JSON.stringify(allComments));
    }
  },

  updatePost: async (post: Post): Promise<void> => {
    const posts: Post[] = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    const updated = posts.map(p => p.id === post.id ? post : p);
    localStorage.setItem(DB_KEYS.POSTS, JSON.stringify(updated));
  },

  // --- MEMBRES ---

  getAllMembers: async (): Promise<Member[]> => {
    await wait(200);
    return JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
  },

  updateUser: async (userId: string, updates: any): Promise<Member | null> => {
    await wait(400);
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    const updatedMembers = members.map(m => {
      if (m.id === userId) {
        // Gestion spéciale de la localisation si city change
        let newLoc = { ...m.location };
        if (updates.city && updates.city !== m.location.city) {
          // Simulation de coordonnées par ville
          const CITY_COORDS: any = { 'Kinshasa': [-4.44, 15.26], 'Pointe-Noire': [-4.78, 11.86] };
          const coords = CITY_COORDS[updates.city] || [-4.26, 15.24];
          newLoc = { ...newLoc, city: updates.city, lat: coords[0], lng: coords[1] };
        }
        return { ...m, ...updates, location: newLoc };
      }
      return m;
    });
    localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify(updatedMembers));
    return updatedMembers.find(m => m.id === userId) || null;
  },

  updateUserLocation: async (userId: string, coords: any, details: any) => {
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    const updated = members.map(m => m.id === userId ? {
      ...m,
      location: { ...m.location, ...coords, ...details }
    } : m);
    localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify(updated));
  },

  // --- FORMATIONS ---

  getTrainings: async (): Promise<TrainingResource[]> => {
    return JSON.parse(localStorage.getItem(DB_KEYS.TRAININGS) || '[]');
  },

  addTraining: async (training: TrainingResource): Promise<void> => {
    const trainings = JSON.parse(localStorage.getItem(DB_KEYS.TRAININGS) || '[]');
    localStorage.setItem(DB_KEYS.TRAININGS, JSON.stringify([training, ...trainings]));
  },

  markTrainingCompleted: async (userId: string, trainingId: string) => {
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    const updated = members.map(m => {
      if (m.id === userId) {
        const completed = m.completedTrainings || [];
        if (!completed.includes(trainingId)) {
          return { ...m, completedTrainings: [...completed, trainingId] };
        }
      }
      return m;
    });
    localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify(updated));
  },

  // --- COMMENTAIRES ---

  getCommentsForPost: async (postId: string): Promise<Comment[]> => {
    const allComments = JSON.parse(localStorage.getItem(DB_KEYS.COMMENTS) || '{}');
    return allComments[postId] || [];
  },

  addComment: async (postId: string, content: string, authorId: string) => {
    const allComments = JSON.parse(localStorage.getItem(DB_KEYS.COMMENTS) || '{}');
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    const author = members.find(m => m.id === authorId);
    
    const newComment: Comment = {
      id: 'comment_' + Date.now(),
      authorName: author?.name || 'Inconnue',
      content,
      timestamp: new Date().toLocaleTimeString()
    };
    
    if (!allComments[postId]) allComments[postId] = [];
    allComments[postId].push(newComment);
    localStorage.setItem(DB_KEYS.COMMENTS, JSON.stringify(allComments));
    
    // Update post count
    const posts: Post[] = JSON.parse(localStorage.getItem(DB_KEYS.POSTS) || '[]');
    const updatedPosts = posts.map(p => p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p);
    localStorage.setItem(DB_KEYS.POSTS, JSON.stringify(updatedPosts));
  },

  // --- DISCUSSION GÉNÉRALE (Simulée Neon) ---

  getDiscussionMessages: async (limit = 10, beforeTimestamp?: string) => {
    await wait(200);
    let messages: DiscussionMessage[] = JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]');
    
    if (beforeTimestamp) {
      messages = messages.filter(m => new Date(m.timestamp).getTime() < new Date(beforeTimestamp).getTime());
    }
    
    return messages.slice(-limit);
  },

  addDiscussionMessage: async (msgData: { authorId: string, content: string }) => {
    const members: Member[] = JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
    const author = members.find(m => m.id === msgData.authorId);
    
    const formatted: DiscussionMessage = {
      id: 'msg_' + Date.now(),
      authorId: msgData.authorId,
      authorName: author?.name || 'Membre',
      authorAvatar: author?.avatar || '',
      content: msgData.content,
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const messages = JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]');
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify([...messages, formatted]));
    return formatted;
  },

  deleteDiscussionMessage: async (id: string) => {
    const messages: DiscussionMessage[] = JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]');
    const filtered = messages.filter(m => m.id !== id);
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(filtered));
  },

  syncMessageCache: () => {}, // Inutile avec LocalStorage direct
  getCachedMessages: () => JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]'),

  // --- LOGIQUE ADMIN & LOCALSTORAGE ---

  getNotifications: () => JSON.parse(localStorage.getItem(DB_KEYS.NOTIFS) || '[]'),
  addNotification: (n: Notification) => {
    const current = JSON.parse(localStorage.getItem(DB_KEYS.NOTIFS) || '[]');
    localStorage.setItem(DB_KEYS.NOTIFS, JSON.stringify([n, ...current]));
  },
  getStrategicGoals: () => JSON.parse(localStorage.getItem(DB_KEYS.GOALS) || '[]'),
  addStrategicGoal: (text: string) => {
    const current = JSON.parse(localStorage.getItem(DB_KEYS.GOALS) || '[]');
    const updated = [...current, { id: Date.now().toString(), text, isCompleted: false }];
    localStorage.setItem(DB_KEYS.GOALS, JSON.stringify(updated));
    return updated;
  },
  toggleStrategicGoal: (id: string) => {
    const current = JSON.parse(localStorage.getItem(DB_KEYS.GOALS) || '[]');
    const updated = current.map((g: any) => g.id === id ? { ...g, isCompleted: !g.isCompleted } : g);
    localStorage.setItem(DB_KEYS.GOALS, JSON.stringify(updated));
    return updated;
  },
  deleteStrategicGoal: (id: string) => {
    const current = JSON.parse(localStorage.getItem(DB_KEYS.GOALS) || '[]');
    const updated = current.filter((g: any) => g.id !== id);
    localStorage.setItem(DB_KEYS.GOALS, JSON.stringify(updated));
    return updated;
  },
  getVictories: () => JSON.parse(localStorage.getItem(DB_KEYS.VICTORIES) || '[]'),
  addVictory: (v: ClusterVictory) => {
    const current = JSON.parse(localStorage.getItem(DB_KEYS.VICTORIES) || '[]');
    const updated = [v, ...current];
    localStorage.setItem(DB_KEYS.VICTORIES, JSON.stringify(updated));
    return updated;
  },
  updateVictory: (id: string, data: any) => {
    const current = JSON.parse(localStorage.getItem(DB_KEYS.VICTORIES) || '[]');
    const updated = current.map((v: any) => v.id === id ? { ...v, ...data } : v);
    localStorage.setItem(DB_KEYS.VICTORIES, JSON.stringify(updated));
    return updated;
  },
  deleteVictory: (id: string) => {
    const current = JSON.parse(localStorage.getItem(DB_KEYS.VICTORIES) || '[]');
    const updated = current.filter((v: any) => v.id !== id);
    localStorage.setItem(DB_KEYS.VICTORIES, JSON.stringify(updated));
    return updated;
  }
};
