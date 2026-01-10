
import { supabase } from './supabaseClient';
import { Member, Post, TrainingResource, Notification, ClusterVictory, DiscussionMessage, Comment } from '../types';
import { MOCK_POSTS, MOCK_MEMBERS, MOCK_TRAININGS } from '../constants';

// --- MAPPERS (SQL -> TypeScript) ---
const mapProfileToMember = (p: any): Member => ({
  id: p.id,
  name: p.name || 'Utilisatrice',
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
  joinedDate: new Date(p.joined_date || p.created_at).toLocaleDateString(),
  status: p.status || 'En Formation',
  trainingProgress: p.training_progress || 0,
  badges: p.badges || [],
  role: p.role || 'MEMBER',
  completedTrainings: p.completed_trainings || []
});

const mapPostToApp = (p: any): Post => ({
  id: p.id,
  authorId: p.author_id,
  content: p.content,
  type: p.type,
  likes: p.likes_count || 0,
  // Correction ici : Supabase retourne un tableau pour l'agrégation count
  comments: p.comments && p.comments.length > 0 ? p.comments[0].count : 0,
  timestamp: new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  image: p.image_url,
  likedBy: p.liked_by || [],
  authorName: p.profiles?.name || 'Membre Cluster',
  authorAvatar: p.profiles?.avatar_url || ''
});

// --- SERVICE ---

export const storageService = {

  // --- AUTHENTIFICATION ---

  getCurrentUser: async (): Promise<Member | null> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) return null;
      return mapProfileToMember({ ...profile, email: session.user.email });
    } catch (e) {
      return null;
    }
  },

  login: async (email: string, password: string): Promise<Member | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.user) {
      return await storageService.getCurrentUser();
    }
    return null;
  },

  register: async (userData: Partial<Member> & { city?: string; address?: string; password?: string }): Promise<Member> => {
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

    if (error) throw new Error(error.message);

    if (data.user) {
      // Les données de profil sont insérées via le trigger SQL, mais on peut forcer la mise à jour des champs spécifiques ici
      const CITY_COORDS: { [key: string]: { lat: number, lng: number } } = {
        'Kinshasa': { lat: -4.4419, lng: 15.2663 },
        'Pointe-Noire': { lat: -4.7855, lng: 11.8635 },
        'Brazzaville': { lat: -4.2634, lng: 15.2429 }
      };
      const baseCoords = CITY_COORDS[userData.city || 'Kinshasa'] || CITY_COORDS['Kinshasa'];

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          business_name: userData.businessName,
          sector: userData.sector,
          city: userData.city,
          address: userData.address,
          latitude: baseCoords.lat + (Math.random() - 0.5) * 0.01,
          longitude: baseCoords.lng + (Math.random() - 0.5) * 0.01,
          role: userData.role || 'MEMBER',
          badges: ['Nouvelle']
        })
        .eq('id', data.user.id);

      if (profileUpdateError) console.warn("Mise à jour profil post-inscription échouée:", profileUpdateError.message);
      
      const user = await storageService.getCurrentUser();
      if (!user) throw new Error("Erreur lors de la récupération du profil.");
      return user;
    }
    throw new Error("Erreur lors de l'inscription.");
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  // --- POSTS ---

  getPosts: async (): Promise<Post[]> => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, comments(count), profiles(name, avatar_url)')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('schema cache') || error.message.includes('not find')) {
          console.warn("Table 'posts' manquante. Utilisation des données Mock.");
          return MOCK_POSTS;
        }
        throw new Error(error.message);
      }
      return (data || []).map(mapPostToApp);
    } catch (e) {
      return MOCK_POSTS;
    }
  },

  addPost: async (post: Post): Promise<void> => {
    const { error } = await supabase.from('posts').insert({
      author_id: post.authorId,
      content: post.content,
      type: post.type,
      image_url: post.image,
      likes_count: 0,
      liked_by: []
    });
    if (error) throw new Error(error.message);
  },

  deletePost: async (postId: string): Promise<void> => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw new Error(error.message);
  },

  updatePost: async (post: Post): Promise<void> => {
    const { error } = await supabase.from('posts')
      .update({
        likes_count: post.likes,
        // Fix: Changed post.liked_by to post.likedBy to match the Post interface property name
        liked_by: post.likedBy
      })
      .eq('id', post.id);
    if (error) throw new Error(error.message);
  },

  // --- MEMBRES ---

  getAllMembers: async (): Promise<Member[]> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) {
        if (error.message.includes('not find')) return MOCK_MEMBERS;
        throw new Error(error.message);
      }
      return (data || []).map(mapProfileToMember);
    } catch (e) {
      return MOCK_MEMBERS;
    }
  },

  updateUser: async (userId: string, updates: any): Promise<Member | null> => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        business_name: updates.businessName,
        sector: updates.sector,
        city: updates.city,
        address: updates.address,
        avatar_url: updates.avatar,
        role: updates.role
      })
      .eq('id', userId);

    if (error) throw new Error(error.message);
    return await storageService.getCurrentUser();
  },

  updateUserLocation: async (userId: string, coords: any, details: any) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        latitude: coords.lat,
        longitude: coords.lng,
        city: details.city,
        address: details.address
      })
      .eq('id', userId);
    if (error) throw new Error(error.message);
  },

  // --- FORMATIONS ---

  getTrainings: async (): Promise<TrainingResource[]> => {
    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message.includes('not find')) return MOCK_TRAININGS;
        throw new Error(error.message);
      }
      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        type: t.type,
        url: t.url,
        duration: t.duration,
        dateAdded: new Date(t.created_at).toLocaleDateString(),
        authorName: t.author_name
      }));
    } catch (e) {
      return MOCK_TRAININGS;
    }
  },

  addTraining: async (training: TrainingResource): Promise<void> => {
    const { error } = await supabase.from('trainings').insert({
      title: training.title,
      description: training.description,
      type: training.type,
      url: training.url,
      duration: training.duration,
      author_name: training.authorName
    });
    if (error) throw new Error(error.message);
  },

  markTrainingCompleted: async (userId: string, trainingId: string) => {
    const { data: profile } = await supabase.from('profiles').select('completed_trainings').eq('id', userId).single();
    if (profile) {
      const current = profile.completed_trainings || [];
      if (!current.includes(trainingId)) {
        await supabase.from('profiles').update({ completed_trainings: [...current, trainingId] }).eq('id', userId);
      }
    }
  },

  // --- COMMENTAIRES ---

  getCommentsForPost: async (postId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) return [];
      return (data || []).map((c: any) => ({
        id: c.id,
        authorName: c.profiles?.name || 'Membre',
        content: c.content,
        timestamp: new Date(c.created_at).toLocaleTimeString()
      }));
    } catch (e) {
      return [];
    }
  },

  addComment: async (postId: string, content: string, authorId: string) => {
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: authorId,
      content: content
    });
    if (error) throw new Error(error.message);
  },

  // --- DISCUSSION GÉNÉRALE ---

  getDiscussionMessages: async (limit = 15, beforeTimestamp?: string) => {
    try {
      let query = supabase
        .from('messages')
        .select('*, profiles(name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeTimestamp) {
        query = query.lt('created_at', beforeTimestamp);
      }

      const { data, error } = await query;
      if (error) return [];

      return (data || []).reverse().map((m: any) => ({
        id: m.id,
        authorId: m.author_id,
        authorName: m.profiles?.name || 'Membre',
        authorAvatar: m.profiles?.avatar_url || '',
        content: m.content,
        timestamp: m.created_at,
        displayTime: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    } catch (e) {
      return [];
    }
  },

  addDiscussionMessage: async (msgData: { authorId: string, content: string }) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        author_id: msgData.authorId,
        content: msgData.content
      })
      .select('*, profiles(name, avatar_url)')
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      authorId: data.author_id,
      authorName: data.profiles?.name || 'Membre',
      authorAvatar: data.profiles?.avatar_url || '',
      content: data.content,
      timestamp: data.created_at,
      displayTime: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  },

  deleteDiscussionMessage: async (id: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- LOGIQUE ADMIN (LocalStorage) ---
  getNotifications: () => JSON.parse(localStorage.getItem('pr_notifs') || '[]'),
  addNotification: (n: Notification) => {
    const current = JSON.parse(localStorage.getItem('pr_notifs') || '[]');
    localStorage.setItem('pr_notifs', JSON.stringify([n, ...current]));
  },
  getStrategicGoals: () => JSON.parse(localStorage.getItem('pr_goals') || '[]'),
  addStrategicGoal: (text: string) => {
    const current = JSON.parse(localStorage.getItem('pr_goals') || '[]');
    const updated = [...current, { id: Date.now().toString(), text, isCompleted: false }];
    localStorage.setItem('pr_goals', JSON.stringify(updated));
    return updated;
  },
  toggleStrategicGoal: (id: string) => {
    const current = JSON.parse(localStorage.getItem('pr_goals') || '[]');
    const updated = current.map((g: any) => g.id === id ? { ...g, isCompleted: !g.isCompleted } : g);
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
    const updated = current.map((v: any) => v.id === id ? { ...v, ...data } : v);
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
