
import { supabase } from './supabaseClient';
import { Member, Post, TrainingResource, Notification, StrategicGoal, ClusterVictory, DiscussionMessage, Comment } from '../types';

// --- MAPPERS (SQL -> TypeScript) ---
const mapProfileToMember = (p: any): Member => ({
  id: p.id,
  name: p.name || 'Utilisateur',
  email: p.email,
  businessName: p.business_name || '',
  sector: p.sector || '',
  location: {
    lat: p.latitude || 0,
    lng: p.longitude || 0,
    address: p.address || '',
    city: p.city || ''
  },
  avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'User')}&background=random`,
  joinedDate: new Date(p.joined_date).toLocaleDateString(),
  status: p.status || 'En Formation',
  trainingProgress: p.training_progress || 0,
  badges: p.badges || [],
  role: p.role || 'MEMBER',
  completedTrainings: p.completed_trainings || []
});

const mapPostToApp = (p: any, profile?: any): Post => ({
  id: p.id,
  authorId: p.author_id,
  content: p.content,
  type: p.type,
  likes: p.likes_count || 0,
  comments: p.comments ? p.comments[0]?.count : 0,
  timestamp: new Date(p.created_at).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}),
  image: p.image_url,
  likedBy: p.liked_by || [],
  commentsList: []
});

// --- CACHE SYSTEM ---
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE = {
  members: { data: null as Member[] | null, timestamp: 0 },
  posts: { data: null as Post[] | null, timestamp: 0 },
  trainings: { data: null as TrainingResource[] | null, timestamp: 0 },
  messages: { data: null as DiscussionMessage[] | null, timestamp: 0 }
};

const isCacheValid = (key: keyof typeof CACHE) => {
  return CACHE[key].data && (Date.now() - CACHE[key].timestamp < CACHE_DURATION);
};

const invalidateCache = (key: keyof typeof CACHE) => {
  CACHE[key].timestamp = 0;
  CACHE[key].data = null;
};

// --- SERVICE ---

export const storageService = {
  
  // AUTH
  getCurrentUser: async (): Promise<Member | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Check cache for members first to avoid refetching own profile if not needed
    if (isCacheValid('members') && CACHE.members.data) {
      const cachedUser = CACHE.members.data.find(m => m.id === session.user.id);
      if (cachedUser) return { ...cachedUser, email: session.user.email };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) return null;
    return mapProfileToMember({ ...profile, email: session.user.email });
  },

  login: async (email: string, password: string): Promise<Member | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      return await storageService.getCurrentUser();
    }
    return null;
  },

  logout: async () => {
    await supabase.auth.signOut();
    // Clear cache on logout
    invalidateCache('members');
    invalidateCache('posts');
    invalidateCache('trainings');
    invalidateCache('messages');
  },

  register: async (userData: Partial<Member> & { city?: string, address?: string, password?: string }): Promise<Member> => {
    if (!userData.email || !userData.password) throw new Error("Email et mot de passe requis");

    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          businessName: userData.businessName
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      const CITY_COORDS: {[key: string]: {lat: number, lng: number}} = {
        'Kinshasa': { lat: -4.4419, lng: 15.2663 },
        'Pointe-Noire': { lat: -4.7855, lng: 11.8635 },
        'Brazzaville': { lat: -4.2634, lng: 15.2429 },
        'Lubumbashi': { lat: -11.6609, lng: 27.4794 },
        'Goma': { lat: -1.6585, lng: 29.2205 },
        'Matadi': { lat: -5.8405, lng: 13.4456 }
      };
      const baseCoords = CITY_COORDS[userData.city || 'Kinshasa'] || CITY_COORDS['Kinshasa'];
      
      await supabase.from('profiles').update({
        sector: userData.sector,
        city: userData.city,
        address: userData.address,
        role: userData.role || 'MEMBER',
        latitude: baseCoords.lat,
        longitude: baseCoords.lng,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random`
      }).eq('id', data.user.id);

      invalidateCache('members'); // New member added
      
      const user = await storageService.getCurrentUser();
      if (!user) throw new Error("Erreur récupération profil après création");
      return user;
    }
    throw new Error("Erreur création utilisateur");
  },

  updateUser: async (userId: string, updates: any): Promise<Member | null> => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.businessName) dbUpdates.business_name = updates.businessName;
    if (updates.sector) dbUpdates.sector = updates.sector;
    if (updates.city) dbUpdates.city = updates.city;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.avatar) dbUpdates.avatar_url = updates.avatar;
    if (updates.role) dbUpdates.role = updates.role;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
    if (error) {
      console.error("Error updating profile:", error);
      return null;
    }
    invalidateCache('members'); // Profile updated
    return await storageService.getCurrentUser();
  },

  getAllMembers: async (): Promise<Member[]> => {
    if (isCacheValid('members') && CACHE.members.data) {
      return CACHE.members.data;
    }

    const { data, error } = await supabase.from('profiles').select('*');
    if (error) return [];
    
    const members = data.map(mapProfileToMember);
    CACHE.members = { data: members, timestamp: Date.now() };
    return members;
  },

  // POSTS
  getPosts: async (forceRefresh = false): Promise<Post[]> => {
    if (!forceRefresh && isCacheValid('posts') && CACHE.posts.data) {
      return CACHE.posts.data;
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*, comments(count)')
      .order('created_at', { ascending: false });
    
    if (error) return [];
    
    const posts = data.map(mapPostToApp);
    CACHE.posts = { data: posts, timestamp: Date.now() };
    return posts;
  },

  addPost: async (post: Post): Promise<void> => {
    const { error } = await supabase.from('posts').insert({
      author_id: post.authorId,
      content: post.content,
      type: post.type,
      image_url: post.image,
      liked_by: [],
      likes_count: 0
    });
    if (error) console.error(error);
    invalidateCache('posts'); // Invalidate to show new post
  },

  updatePost: async (post: Post): Promise<void> => {
    const { error } = await supabase.from('posts').update({
      likes_count: post.likes,
      liked_by: post.likedBy
    }).eq('id', post.id);
    
    // We don't invalidate everything for a like to keep it snappy, 
    // but we update cache locally if it exists
    if (CACHE.posts.data) {
      CACHE.posts.data = CACHE.posts.data.map(p => p.id === post.id ? post : p);
    }
  },

  addComment: async (postId: string, content: string, authorId?: string, authorName?: string): Promise<void> => {
     const { error } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: authorId || null,
        content: content
     });
     invalidateCache('posts'); // Invalidate to update comment counts if needed
  },

  getCommentsForPost: async (postId: string): Promise<Comment[]> => {
     // Comments are not heavily cached as they are sub-resources loaded on demand
     const { data } = await supabase
        .from('comments')
        .select('*, profiles(name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
     
     if (!data) return [];
     return data.map((c: any) => ({
        id: c.id,
        authorName: c.profiles?.name || 'Visiteur',
        content: c.content,
        timestamp: new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
     }));
  },

  // TRAININGS
  getTrainings: async (): Promise<TrainingResource[]> => {
    if (isCacheValid('trainings') && CACHE.trainings.data) {
      return CACHE.trainings.data;
    }

    const { data, error } = await supabase.from('trainings').select('*').order('created_at', { ascending: false });
    if (error) return [];
    
    const trainings = data.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      url: t.url,
      duration: t.duration,
      dateAdded: new Date(t.created_at).toLocaleDateString(),
      authorName: t.author_name
    }));

    CACHE.trainings = { data: trainings, timestamp: Date.now() };
    return trainings;
  },

  addTraining: async (training: TrainingResource): Promise<void> => {
    await supabase.from('trainings').insert({
       title: training.title,
       description: training.description,
       type: training.type,
       url: training.url,
       duration: training.duration,
       author_name: training.authorName
    });
    invalidateCache('trainings');
  },

  markTrainingCompleted: async (userId: string, trainingId: string): Promise<void> => {
     const { data: profile } = await supabase.from('profiles').select('completed_trainings').eq('id', userId).single();
     if (profile) {
        const current = profile.completed_trainings || [];
        if (!current.includes(trainingId)) {
           const updated = [...current, trainingId];
           // Get total for percentage (use cache if available)
           let total = 1;
           if (isCacheValid('trainings') && CACHE.trainings.data) {
              total = CACHE.trainings.data.length || 1;
           } else {
              const { count } = await supabase.from('trainings').select('*', { count: 'exact', head: true });
              total = count || 1;
           }

           const progress = Math.round((updated.length / total) * 100);
           
           await supabase.from('profiles').update({
              completed_trainings: updated,
              training_progress: progress
           }).eq('id', userId);
           
           invalidateCache('members'); // Update member stats
        }
     }
  },

  // DISCUSSION
  getDiscussionMessages: async (): Promise<DiscussionMessage[]> => {
    // Short cache for discussion to allow near-realtime but prevent spamming DB on re-renders
    if (CACHE.messages.data && (Date.now() - CACHE.messages.timestamp < 2000)) {
       return CACHE.messages.data;
    }

    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(50);
      
    if (!data) return [];
    
    const messages = data.map((m: any) => ({
      id: m.id,
      authorId: m.author_id,
      authorName: m.profiles?.name || 'Inconnu',
      authorAvatar: m.profiles?.avatar_url || '',
      content: m.content,
      timestamp: m.created_at,
      displayTime: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }));

    CACHE.messages = { data: messages, timestamp: Date.now() };
    return messages;
  },

  addDiscussionMessage: async (msg: Partial<DiscussionMessage>): Promise<void> => {
     await supabase.from('messages').insert({
        author_id: msg.authorId,
        content: msg.content
     });
     invalidateCache('messages');
  },

  // OTHER (LocalStorage - Fast enough)
  getNotifications: () => JSON.parse(localStorage.getItem('pr_notifs') || '[]'),
  addNotification: (n: Notification) => {
     const current = JSON.parse(localStorage.getItem('pr_notifs') || '[]');
     localStorage.setItem('pr_notifs', JSON.stringify([n, ...current]));
  },
  getStrategicGoals: () => JSON.parse(localStorage.getItem('pr_goals') || '[]'),
  addStrategicGoal: (text: string) => {
     const current = JSON.parse(localStorage.getItem('pr_goals') || '[]');
     const newGoal = { id: Date.now().toString(), text, isCompleted: false };
     const updated = [...current, newGoal];
     localStorage.setItem('pr_goals', JSON.stringify(updated));
     return updated;
  },
  toggleStrategicGoal: (id: string) => {
      const current = JSON.parse(localStorage.getItem('pr_goals') || '[]');
      const updated = current.map((g: any) => g.id === id ? {...g, isCompleted: !g.isCompleted} : g);
      localStorage.setItem('pr_goals', JSON.stringify(updated));
      return updated;
  },
  deleteStrategicGoal: (id: string) => {
     const current = JSON.parse(localStorage.getItem('pr_goals') || '[]');
     const updated = current.filter((g: any) => g.id !== id);
     localStorage.setItem('pr_goals', JSON.stringify(updated));
     return updated;
  },
  getVictories: () => JSON.parse(localStorage.getItem('pr_victories') || '[]'),
  addVictory: (v: ClusterVictory) => {
      const current = JSON.parse(localStorage.getItem('pr_victories') || '[]');
      const updated = [v, ...current];
      localStorage.setItem('pr_victories', JSON.stringify(updated));
      return updated;
  },
  updateVictory: (id: string, data: any) => {
      const current = JSON.parse(localStorage.getItem('pr_victories') || '[]');
      const updated = current.map((v: any) => v.id === id ? {...v, ...data} : v);
      localStorage.setItem('pr_victories', JSON.stringify(updated));
      return updated;
  },
  deleteVictory: (id: string) => {
      const current = JSON.parse(localStorage.getItem('pr_victories') || '[]');
      const updated = current.filter((v: any) => v.id !== id);
      localStorage.setItem('pr_victories', JSON.stringify(updated));
      return updated;
  }
};
