
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
    
    const localUser = localStorage.getItem(KEYS.USER);
    if (localUser) {
      const user = JSON.parse(localUser);
      // Refresh from DB
      const members = await storageService.getAllMembers();
      return members.find(m => m.id === user.id) || user;
    }
    return null;
  },

  login: async (email: string, password: string): Promise<Member | null> => {
    const members = await storageService.getAllMembers();
    const user = members.find(m => m.email === email);
    if (user) {
      setLocal(KEYS.USER, user);
      return user;
    }
    throw new Error("Email ou mot de passe incorrect.");
  },

  register: async (userData: Partial<Member> & { city?: string; address?: string; password?: string }): Promise<Member> => {
    const id = Math.random().toString(36).substr(2, 9);
    const CITY_COORDS: { [key: string]: { lat: number, lng: number } } = {
      'Kinshasa': { lat: -4.4419, lng: 15.2663 },
      'Pointe-Noire': { lat: -4.7855, lng: 11.8635 },
      'Brazzaville': { lat: -4.2634, lng: 15.2429 }
    };
    const baseCoords = CITY_COORDS[userData.city || 'Kinshasa'] || CITY_COORDS['Kinshasa'];

    const newUser: Partial<Member> = {
      id,
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
      role: userData.role || 'MEMBER'
    };
    
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });

    const members = await storageService.getAllMembers();
    const created = members.find(m => m.id === id)!;
    setLocal(KEYS.USER, created);
    return created;
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
    const response = await fetch('/api/members');
    if (!response.ok) return [];
    return await response.json();
  },

  updateUser: async (userId: string, updates: any): Promise<Member | null> => {
    await fetch(`/api/members/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    const members = await storageService.getAllMembers();
    const updatedUser = members.find(m => m.id === userId) || null;
    
    const currentUser = await storageService.getCurrentUser();
    if (currentUser?.id === userId && updatedUser) {
      setLocal(KEYS.USER, updatedUser);
    }
    return updatedUser;
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
    const response = await fetch('/api/trainings');
    if (!response.ok) return [];
    return await response.json();
  },

  addTraining: async (training: TrainingResource): Promise<void> => {
    await fetch('/api/trainings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(training),
    });
  },

  markTrainingCompleted: async (userId: string, trainingId: string) => {
    const currentUser = await storageService.getCurrentUser();
    if (currentUser?.id === userId) {
      const completed = currentUser.completedTrainings || [];
      if (!completed.includes(trainingId)) {
        const newCompleted = [...completed, trainingId];
        await storageService.updateUser(userId, { completedTrainings: newCompleted });
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
    const response = await fetch('/api/discussion');
    if (!response.ok) return [];
    const messages = await response.json();
    return messages.slice(-limit);
  },

  addDiscussionMessage: async (msgData: { authorId: string, content: string }) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newMessage = {
      id,
      authorId: msgData.authorId,
      content: msgData.content,
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    await fetch('/api/discussion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMessage),
    });
    
    const messages = await storageService.getDiscussionMessages();
    return messages.find(m => m.id === id)!;
  },

  deleteDiscussionMessage: async (id: string) => {
    await fetch(`/api/discussion/${id}`, { method: 'DELETE' });
  },

  // --- LOGIQUE ADMIN ---
  getNotifications: async () => {
    const response = await fetch('/api/notifications');
    if (!response.ok) return [];
    return await response.json();
  },
  addNotification: async (n: Notification) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n),
    });
  },
  getStrategicGoals: async () => {
    const response = await fetch('/api/goals');
    if (!response.ok) return [];
    return await response.json();
  },
  addStrategicGoal: async (text: string) => {
    const id = Date.now().toString();
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text }),
    });
    return await storageService.getStrategicGoals();
  },
  toggleStrategicGoal: async (id: string, isCompleted: boolean) => {
    await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted }),
    });
    return await storageService.getStrategicGoals();
  },
  deleteStrategicGoal: async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    return await storageService.getStrategicGoals();
  },
  getVictories: async () => {
    const response = await fetch('/api/victories');
    if (!response.ok) return [];
    return await response.json();
  },
  addVictory: async (v: ClusterVictory) => {
    await fetch('/api/victories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    });
    return await storageService.getVictories();
  },
  updateVictory: async (id: string, data: any) => {
    await fetch(`/api/victories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await storageService.getVictories();
  },
  deleteVictory: async (id: string) => {
    await fetch(`/api/victories/${id}`, { method: 'DELETE' });
    return await storageService.getVictories();
  }
};
