
import { Member, Post, TrainingResource, Notification, ClusterVictory, DiscussionMessage, Comment } from '../types';
import { MOCK_POSTS, MOCK_MEMBERS, MOCK_TRAININGS } from '../constants';

// --- LOCAL STORAGE KEYS ---
const KEYS = {
  USER: 'cluster_current_user',
  POSTS: 'cluster_posts',
  MEMBERS: 'cluster_members',
  TRAININGS: 'cluster_trainings',
  NOTIFS: 'cluster_notifs',
  GOALS: 'cluster_goals',
  VICTORIES: 'cluster_victories',
  MESSAGES: 'cluster_messages',
  COMMENTS: 'cluster_comments'
};

// --- HELPERS ---
const getLocal = <T>(key: string, fallback: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- SERVICE ---
export const storageService = {

  // --- SCORES API ---
  getUserScores: async (userId: string): Promise<any[]> => {
    const response = await fetch(`/api/scores/${userId}`);
    if (!response.ok) return [];
    return await response.json();
  },

  addScore: async (userId: string, score: number, category?: string): Promise<void> => {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, score, category }),
    });
  },

  getLeaderboard: async (): Promise<any[]> => {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) return [];
    return await response.json();
  },

  // --- AUTHENTIFICATION (MOCK + GOOGLE) ---
  getCurrentUser: async (): Promise<Member | null> => {
    const googleUser = localStorage.getItem('google_user');
    if (googleUser) return JSON.parse(googleUser);
    return getLocal<Member | null>(KEYS.USER, null);
  },

  login: async (email: string, password: string): Promise<Member | null> => {
    // Simple mock login: find in mock members or local members
    const members = getLocal<Member[]>(KEYS.MEMBERS, MOCK_MEMBERS);
    const user = members.find(m => m.email === email);
    if (user) {
      setLocal(KEYS.USER, user);
      return user;
    }
    throw new Error("Email ou mot de passe incorrect.");
  },

  register: async (userData: Partial<Member> & { city?: string; address?: string; password?: string }): Promise<Member> => {
    const members = getLocal<Member[]>(KEYS.MEMBERS, MOCK_MEMBERS);
    
    const CITY_COORDS: { [key: string]: { lat: number, lng: number } } = {
      'Kinshasa': { lat: -4.4419, lng: 15.2663 },
      'Pointe-Noire': { lat: -4.7855, lng: 11.8635 },
      'Brazzaville': { lat: -4.2634, lng: 15.2429 }
    };
    const baseCoords = CITY_COORDS[userData.city || 'Kinshasa'] || CITY_COORDS['Kinshasa'];

    const newUser: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: userData.name || 'Utilisatrice',
      email: userData.email || '',
      businessName: userData.businessName || '',
      sector: userData.sector || '',
      location: { 
        lat: baseCoords.lat + (Math.random() - 0.5) * 0.01, 
        lng: baseCoords.lng + (Math.random() - 0.5) * 0.01, 
        address: userData.address || '', 
        city: userData.city || 'Kinshasa' 
      },
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random`,
      joinedDate: new Date().toLocaleDateString(),
      status: 'En Formation',
      trainingProgress: 0,
      badges: ['Nouvelle'],
      role: userData.role || 'MEMBER',
      completedTrainings: []
    };
    
    setLocal(KEYS.MEMBERS, [newUser, ...members]);
    setLocal(KEYS.USER, newUser);
    return newUser;
  },

  logout: async () => {
    localStorage.removeItem('google_user');
    localStorage.removeItem(KEYS.USER);
  },

  // --- POSTS ---
  getPosts: async (): Promise<Post[]> => {
    const response = await fetch('/api/posts');
    if (!response.ok) return [];
    return await response.json();
  },

  addPost: async (post: Post): Promise<void> => {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
  },

  deletePost: async (postId: string): Promise<void> => {
    // Not implemented in server yet, but we can keep it as mock or add it
    const posts = getLocal<Post[]>(KEYS.POSTS, MOCK_POSTS);
    setLocal(KEYS.POSTS, posts.filter(p => p.id !== postId));
  },

  updatePost: async (post: Post): Promise<void> => {
    await fetch(`/api/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ likes: post.likes, likedBy: post.likedBy }),
    });
  },

  // --- MEMBRES ---
  getAllMembers: async (): Promise<Member[]> => {
    return getLocal<Member[]>(KEYS.MEMBERS, MOCK_MEMBERS);
  },

  updateUser: async (userId: string, updates: any): Promise<Member | null> => {
    const members = getLocal<Member[]>(KEYS.MEMBERS, MOCK_MEMBERS);
    const updatedMembers = members.map(m => m.id === userId ? { ...m, ...updates } : m);
    setLocal(KEYS.MEMBERS, updatedMembers);
    
    const currentUser = await storageService.getCurrentUser();
    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...updates };
      setLocal(KEYS.USER, updatedUser);
      return updatedUser;
    }
    return null;
  },

  updateUserLocation: async (userId: string, coords: any, details: any) => {
    await storageService.updateUser(userId, {
      location: {
        lat: coords.lat,
        lng: coords.lng,
        city: details.city,
        address: details.address
      }
    });
  },

  // --- FORMATIONS ---
  getTrainings: async (): Promise<TrainingResource[]> => {
    return getLocal<TrainingResource[]>(KEYS.TRAININGS, MOCK_TRAININGS);
  },

  addTraining: async (training: TrainingResource): Promise<void> => {
    const trainings = getLocal<TrainingResource[]>(KEYS.TRAININGS, MOCK_TRAININGS);
    setLocal(KEYS.TRAININGS, [training, ...trainings]);
  },

  markTrainingCompleted: async (userId: string, trainingId: string) => {
    const members = getLocal<Member[]>(KEYS.MEMBERS, MOCK_MEMBERS);
    const updatedMembers = members.map(m => {
      if (m.id === userId) {
        const completed = m.completedTrainings || [];
        if (!completed.includes(trainingId)) {
          return { ...m, completedTrainings: [...completed, trainingId] };
        }
      }
      return m;
    });
    setLocal(KEYS.MEMBERS, updatedMembers);
    
    const currentUser = await storageService.getCurrentUser();
    if (currentUser?.id === userId) {
      const completed = currentUser.completedTrainings || [];
      if (!completed.includes(trainingId)) {
        setLocal(KEYS.USER, { ...currentUser, completedTrainings: [...completed, trainingId] });
      }
    }
  },

  // --- COMMENTAIRES ---
  getCommentsForPost: async (postId: string): Promise<Comment[]> => {
    const response = await fetch(`/api/posts/${postId}/comments`);
    if (!response.ok) return [];
    return await response.json();
  },

  addComment: async (postId: string, content: string, authorId: string) => {
    await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId, content }),
    });
  },

  // --- DISCUSSION GÉNÉRALE ---
  getDiscussionMessages: async (limit = 15, beforeTimestamp?: string) => {
    const messages = getLocal<DiscussionMessage[]>(KEYS.MESSAGES, []);
    // Simple mock: return last N messages
    return messages.slice(-limit);
  },

  addDiscussionMessage: async (msgData: { authorId: string, content: string }) => {
    const messages = getLocal<DiscussionMessage[]>(KEYS.MESSAGES, []);
    const members = getLocal<Member[]>(KEYS.MEMBERS, MOCK_MEMBERS);
    const author = members.find(m => m.id === msgData.authorId);
    
    const newMessage: DiscussionMessage = {
      id: Math.random().toString(36).substr(2, 9),
      authorId: msgData.authorId,
      authorName: author?.name || 'Membre',
      authorAvatar: author?.avatar || '',
      content: msgData.content,
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setLocal(KEYS.MESSAGES, [...messages, newMessage]);
    return newMessage;
  },

  deleteDiscussionMessage: async (id: string) => {
    const messages = getLocal<DiscussionMessage[]>(KEYS.MESSAGES, []);
    setLocal(KEYS.MESSAGES, messages.filter(m => m.id !== id));
  },

  // --- LOGIQUE ADMIN ---
  getNotifications: () => getLocal<Notification[]>(KEYS.NOTIFS, []),
  addNotification: (n: Notification) => {
    const current = getLocal<Notification[]>(KEYS.NOTIFS, []);
    setLocal(KEYS.NOTIFS, [n, ...current]);
  },
  getStrategicGoals: () => getLocal<any[]>(KEYS.GOALS, []),
  addStrategicGoal: (text: string) => {
    const current = getLocal<any[]>(KEYS.GOALS, []);
    const updated = [...current, { id: Date.now().toString(), text, isCompleted: false }];
    setLocal(KEYS.GOALS, updated);
    return updated;
  },
  toggleStrategicGoal: (id: string) => {
    const current = getLocal<any[]>(KEYS.GOALS, []);
    const updated = current.map((g: any) => g.id === id ? { ...g, isCompleted: !g.isCompleted } : g);
    setLocal(KEYS.GOALS, updated);
    return updated;
  },
  deleteStrategicGoal: (id: string) => {
    const current = getLocal<any[]>(KEYS.GOALS, []);
    const updated = current.filter((g: any) => g.id !== id);
    setLocal(KEYS.GOALS, updated);
    return updated;
  },
  getVictories: () => getLocal<ClusterVictory[]>(KEYS.VICTORIES, []),
  addVictory: (v: ClusterVictory) => {
    const current = getLocal<ClusterVictory[]>(KEYS.VICTORIES, []);
    const updated = [v, ...current];
    setLocal(KEYS.VICTORIES, updated);
    return updated;
  },
  updateVictory: (id: string, data: any) => {
    const current = getLocal<ClusterVictory[]>(KEYS.VICTORIES, []);
    const updated = current.map((v: any) => v.id === id ? { ...v, ...data } : v);
    setLocal(KEYS.VICTORIES, updated);
    return updated;
  },
  deleteVictory: (id: string) => {
    const current = getLocal<ClusterVictory[]>(KEYS.VICTORIES, []);
    const updated = current.filter((v: any) => v.id !== id);
    setLocal(KEYS.VICTORIES, updated);
    return updated;
  }
};
