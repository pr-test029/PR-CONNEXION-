

export interface Member {
  id: string;
  name: string;
  email?: string; // Added for Auth
  password?: string; // Added for Auth
  businessName: string;
  sector: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
  };
  avatar: string;
  joinedDate: string;
  status: 'Active' | 'En Formation' | 'Certifiée';
  trainingProgress: number; // 0-100
  badges: string[];
  role: 'ADMIN' | 'MEMBER'; // Added Role
  completedTrainings: string[]; // Added to track completed training IDs
}

export interface Comment {
  id: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  type: 'Besoin' | 'Partage' | 'Succès' | 'Question';
  likes: number;
  comments: number;
  timestamp: string;
  image?: string;
  likedBy: string[]; // Array of User IDs who liked this post
  commentsList?: Comment[];
  authorName?: string;
  authorAvatar?: string;
}

export interface DiscussionMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: string; // ISO string for sorting
  displayTime: string; // Human readable time
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingMetadata?: any;
}

export type TrainingType = 'PDF' | 'VIDEO' | 'AUDIO' | 'WORD' | 'LINK';

export interface TrainingResource {
  id: string;
  title: string;
  description: string;
  type: TrainingType;
  url: string; // URL of the file or the external link
  thumbnail?: string;
  duration?: string; // e.g., "10 min", "15 pages"
  dateAdded: string;
  authorName: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  authorName: string;
}

export interface ClusterVictory {
  id: string;
  title: string;
  description: string;
  date: string;
}

export interface StrategicGoal {
  id: string;
  text: string;
  isCompleted: boolean;
}

export enum AppView {
  FEED = 'FEED',
  DISCUSSION = 'DISCUSSION', // Added Discussion view
  MAP = 'MAP',
  PROFILE = 'PROFILE',
  TRAINING = 'TRAINING',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN',
  NOTIFICATIONS = 'NOTIFICATIONS',
  SETTINGS = 'SETTINGS', // Added Settings view
  AUTH = 'AUTH'
}