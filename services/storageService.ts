import { supabase } from './supabaseClient';
import { Member, Post, TrainingResource, Notification, StrategicGoal, ClusterVictory, DiscussionMessage, Comment } from '../types';
import { MOCK_MEMBERS, MOCK_POSTS, MOCK_TRAININGS } from '../constants';

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

const mapPostToApp = (p: any): Post => ({
  id: p.id,
  authorId: p.author_id,
  content: p.content,
  type: p.type,
  likes: p.likes_count || 0,
  comments: p.comments ? p.comments[0]?.count : 0,
  timestamp: new Date(p.created_at).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}),
  image: p.image_url,
  likedBy: p.liked_by || [],
  commentsList: [],
  authorName: p.profiles?.name || 'Membre Cluster',
  authorAvatar: p.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.profiles?.name || 'User')}&background=random`
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
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
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

      if (error) {
         // If profile doesn't exist but user does, it might be a sync issue or first login
         // We don't have a mock fallback for "me" specifically without a session context
         return null;
      }
      return mapProfileToMember({ ...profile, email: session.user.email });
    } catch (e) {
      console.warn("Auth check failed:", e);
      return null;
    }
  },

  login: async (email: string, password: string): Promise<Member | null> => {
    // We cannot mock login easily without compromising security logic flow in Auth.tsx
    // So we let this throw if network fails, but Auth.tsx handles the error display.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      return await storageService.getCurrentUser();
    }
    return null;
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Logout network error", e);
    }
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
      
      // Reduce jitter to approx 500m (0.005 degrees) for better initial accuracy while keeping privacy
      const jitter = () => (Math.random() - 0.5) * 0.005;

      await supabase.from('profiles').update({
        sector: userData.sector,
        city: userData.city,
        address: userData.address,
        role: userData.role || 'MEMBER',
        latitude: baseCoords.lat + jitter(),
        longitude: baseCoords.lng + jitter(),
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random`
      }).eq('id', data.user.id);

      invalidateCache('members'); // New member added
      
      const user = await storageService.getCurrentUser();
      if (!user) throw new Error("Erreur récupération profil après création");
      return user;
    }
    throw new Error("Erreur création utilisateur");
  },

  updateUserLocation: async (userId: string, coords: { lat: number, lng: number }, locationDetails?: { city?: string, address?: string }): Promise<void> => {
    const updates: any = {
      latitude: coords.lat,
      longitude: coords.lng
    };
    if (locationDetails?.city) updates.city = locationDetails.city;
    if (locationDetails?.address) updates.address = locationDetails.address;

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    
    if (error) {
      console.error("Error updating location:", error);
      throw new Error("Impossible de mettre à jour la localisation. " + error.message);
    }
    // Update cache if it exists
    if (CACHE.members.data) {
       CACHE.members.data = CACHE.members.data.map(m => 
         m.id === userId ? { 
           ...m, 
           location: { 
             ...m.location, 
             lat: coords.lat, 
             lng: coords.lng,
             ...(locationDetails?.city && { city: locationDetails.city }),
             ...(locationDetails?.address && { address: locationDetails.address })
           } 
         } : m
       );
    } else {
       invalidateCache('members');
    }
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
      throw new Error("Échec de la mise à jour du profil. " + error.message);
    }
    invalidateCache('members'); // Profile updated
    return await storageService.getCurrentUser();
  },

  getAllMembers: async (): Promise<Member[]> => {
    if (isCacheValid('members') && CACHE.members.data) {
      return CACHE.members.data;
    }

    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      
      const members = data.map(mapProfileToMember);
      CACHE.members = { data: members, timestamp: Date.now() };
      return members;
    } catch (e) {
      console.warn("Fetch members failed, using fallback.", e);
      // Return cache if exists, otherwise return Mock data
      if (CACHE.members.data) return CACHE.members.data;
      return MOCK_MEMBERS;
    }
  },

  // POSTS
  getPosts: async (forceRefresh = false): Promise<Post[]> => {
    // If not forcing refresh and cache is valid, return cache
    if (!forceRefresh && isCacheValid('posts') && CACHE.posts.data) {
      return CACHE.posts.data;
    }

    try {
      // Fetch from DB
      const { data, error } = await supabase
        .from('posts')
        .select('*, comments(count), profiles(name, avatar_url)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map to App Type
      const posts = data.map(mapPostToApp);

      CACHE.posts = { data: posts, timestamp: Date.now() };
      return posts;
    } catch (error: any) {
      console.warn("GetPosts failed (network or DB), using fallback:", error.message);
      
      // Return stale cache if available
      if (CACHE.posts.data) return CACHE.posts.data;

      // Return Mocks as last resort to prevent app crash
      return MOCK_POSTS;
    }
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
    if (error) {
      console.error("Add post error:", error);
      throw new Error("Impossible de publier le post. " + error.message);
    }
    invalidateCache('posts'); // Invalidate to show new post
  },

  updatePost: async (post: Post): Promise<void> => {
    // Optimistically update cache first for immediate UI response
    if (CACHE.posts.data) {
      CACHE.posts.data = CACHE.posts.data.map(p => p.id === post.id ? post : p);
    }

    try {
      const { error } = await supabase.from('posts').update({
        likes_count: post.likes,
        liked_by: post.likedBy
      }).eq('id', post.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Failed to update post:", error.message);
      // Suppress error visually, just log it. UX is already optimistic.
    }
  },

  addComment: async (postId: string, content: string, authorId?: string): Promise<void> => {
     try {
       // Strictly try to insert into DB.
       const { error } = await supabase.from('comments').insert({
          post_id: postId,
          author_id: authorId || null, 
          content: content
       });

       if (error) throw error;
       invalidateCache('posts'); // Invalidate to update comment counts globally
     } catch (e: any) {
       console.warn("Comment DB insert failed (RLS or Network), trying fallback for usability");
       
       // Fallback to LocalStorage so interaction isn't lost for the user
       // Note: This matches previous fallback logic requested to fix RLS/Errors
       const localComments = JSON.parse(localStorage.getItem('pr_local_comments') || '[]');
       const newLocalComment = {
         id: `local-${Date.now()}`,
         post_id: postId,
         author_id: authorId,
         content: content,
         created_at: new Date().toISOString(),
         is_local: true
       };
       localStorage.setItem('pr_local_comments', JSON.stringify([...localComments, newLocalComment]));
       
       invalidateCache('posts');
     }
  },

  getCommentsForPost: async (postId: string): Promise<Comment[]> => {
     try {
       // Fetch strictly from DB
       const { data, error } = await supabase
          .from('comments')
          .select('*, profiles(name)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
       
       if (error) throw error;

       const dbComments = (data || []).map((c: any) => ({
          id: c.id,
          authorName: c.profiles?.name || 'Visiteur',
          content: c.content,
          timestamp: new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
       }));

       // Merge with Local Storage fallbacks (if any existed from previous errors)
       const localComments = JSON.parse(localStorage.getItem('pr_local_comments') || '[]')
         .filter((c: any) => c.post_id === postId)
         .map((c: any) => ({
            id: c.id,
            authorName: 'Moi (Local)',
            content: c.content,
            timestamp: new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
         }));

       return [...dbComments, ...localComments].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

     } catch (e) {
       console.warn("Fetch comments failed", e);
       // Return local comments if DB fails completely
       const localComments = JSON.parse(localStorage.getItem('pr_local_comments') || '[]')
         .filter((c: any) => c.post_id === postId)
         .map((c: any) => ({
            id: c.id,
            authorName: 'Moi (Local)',
            content: c.content,
            timestamp: new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
         }));
       return localComments;
     }
  },

  // TRAININGS
  getTrainings: async (): Promise<TrainingResource[]> => {
    if (isCacheValid('trainings') && CACHE.trainings.data) {
      return CACHE.trainings.data;
    }

    try {
      const { data, error } = await supabase.from('trainings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
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
    } catch (e) {
      console.warn("Fetch trainings failed, using fallback.", e);
      if (CACHE.trainings.data) return CACHE.trainings.data;
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
    if (error) {
       throw new Error("Impossible d'ajouter la formation. " + error.message);
    }
    invalidateCache('trainings');
  },

  markTrainingCompleted: async (userId: string, trainingId: string): Promise<void> => {
     try {
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
                // Approximate fallback if no cache/network
                total = 10;
             }

             const progress = Math.round((updated.length / total) * 100);
             
             await supabase.from('profiles').update({
                completed_trainings: updated,
                training_progress: progress
             }).eq('id', userId);
             
             invalidateCache('members'); // Update member stats
          }
       }
     } catch (e) {
       console.error("Mark training complete failed", e);
     }
  },

  // DISCUSSION
  // Sync helper to get cache immediately if available
  getCachedMessages: (): DiscussionMessage[] => {
    return CACHE.messages.data || [];
  },

  // Allow UI to push updates to cache (keeps cache fresh on Realtime events)
  syncMessageCache: (messages: DiscussionMessage[]) => {
    CACHE.messages = { data: messages, timestamp: Date.now() };
  },

  getDiscussionMessages: async (limit = 10, beforeTimestamp?: string): Promise<DiscussionMessage[]> => {
    // If no beforeTimestamp is provided, we might look at cache
    // But since we want to handle pagination robustly, we often hit DB for older chunks.
    // We only return cache if it's the *initial* load (no cursor) and it's populated.
    if (!beforeTimestamp && isCacheValid('messages') && CACHE.messages.data && CACHE.messages.data.length >= limit) {
      // Just return the cached amount requested (slice from end as cache is chronological)
      return CACHE.messages.data.slice(-limit);
    }

    try {
      let query = supabase
        .from('messages')
        .select('*, profiles(name, avatar_url)')
        .order('created_at', { ascending: false }) // Newest first
        .limit(limit);

      if (beforeTimestamp) {
        query = query.lt('created_at', beforeTimestamp);
      }

      const { data, error } = await query;
        
      if (error) throw error;
      if (!data) return [];
      
      // Reverse to display chronologically (Oldest -> Newest) in the chat
      const newMessages = data.reverse().map((m: any) => ({
        id: m.id,
        authorId: m.author_id,
        authorName: m.profiles?.name || 'Inconnu',
        authorAvatar: m.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.profiles?.name || 'User')}&background=random`,
        content: m.content,
        timestamp: m.created_at,
        displayTime: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }));

      // Update Cache Strategy:
      // If it's an initial load, replace cache.
      // If it's pagination (beforeTimestamp), prepend to cache.
      if (!beforeTimestamp) {
         // It's the latest chunk. If we have existing cache, we might want to be smart, 
         // but strictly speaking, if we asked for latest and got it, we can seed the cache.
         // However, to keep it simple and safe:
         CACHE.messages = { data: newMessages, timestamp: Date.now() };
      } else if (CACHE.messages.data) {
         // We fetched older messages. Prepend them to the known cache.
         // Filter duplicates just in case
         const existingIds = new Set(CACHE.messages.data.map(m => m.id));
         const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
         CACHE.messages.data = [...uniqueNew, ...CACHE.messages.data];
      }

      return newMessages;
    } catch (e) {
      console.warn("Fetch messages failed", e);
      // Return empty or cache if exists
      if (CACHE.messages.data && !beforeTimestamp) return CACHE.messages.data.slice(-limit);
      return [];
    }
  },

  addDiscussionMessage: async (msg: Partial<DiscussionMessage>): Promise<DiscussionMessage> => {
     const { data, error } = await supabase.from('messages').insert({
        author_id: msg.authorId,
        content: msg.content
     }).select('*, profiles(name, avatar_url)').single();
     
     if (error) {
        console.error("Error sending message:", error);
        throw new Error(error.message);
     }
     
     // Formatted message
     const formatted: DiscussionMessage = {
        id: data.id,
        authorId: data.author_id,
        authorName: data.profiles?.name || 'Inconnu',
        authorAvatar: data.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.profiles?.name || 'User')}&background=random`,
        content: data.content,
        timestamp: data.created_at,
        displayTime: new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
     };

     // Update cache immediately if exists
     if (CACHE.messages.data) {
        CACHE.messages.data = [...CACHE.messages.data, formatted];
     } else {
        CACHE.messages = { data: [formatted], timestamp: Date.now() };
     }

     return formatted;
  },

  deleteDiscussionMessage: async (messageId: string): Promise<void> => {
    // Use simple delete without select to avoid RLS read policy issues
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error("Delete error:", error);
      throw new Error(error.message);
    }
    
    // Crucial: Update cache locally immediately to prevent "ghost" messages
    if (CACHE.messages.data) {
      CACHE.messages.data = CACHE.messages.data.filter(m => m.id !== messageId);
    }
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