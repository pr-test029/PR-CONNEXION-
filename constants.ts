
import { Member, Post, TrainingResource } from './types';

export const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Marie-Claire Bakala',
    email: 'marie@cged.com',
    password: 'password123',
    businessName: 'Épices du Congo',
    sector: 'Agroalimentaire',
    location: { lat: -4.4419, lng: 15.2663, address: 'Av. de la Paix, Kinshasa', city: 'Kinshasa' },
    avatar: 'https://picsum.photos/200/200?random=1',
    joinedDate: '2024-02-15',
    status: 'Certifiée',
    trainingProgress: 100,
    badges: ['Expert Qualité', 'Formatrice'],
    role: 'ADMIN',
    completedTrainings: ['t1', 't2', 't3', 't4']
  },
  {
    id: '2',
    name: 'Solange Ngoma',
    email: 'solange@cged.com',
    password: 'password123',
    businessName: 'Tissus & Mode Kinois',
    sector: 'Textile',
    location: { lat: -4.3250, lng: 15.3222, address: 'Marché de la Liberté', city: 'Kinshasa' },
    avatar: 'https://picsum.photos/200/200?random=2',
    joinedDate: '2025-01-10',
    status: 'En Formation',
    trainingProgress: 45,
    badges: ['Nouveau Membre'],
    role: 'MEMBER',
    completedTrainings: ['t1']
  },
  {
    id: '3',
    name: 'Bernadette Okitoundu',
    email: 'bernadette@cged.com',
    password: 'password123',
    businessName: 'Coopérative Agri-Femmes',
    sector: 'Agriculture',
    location: { lat: -4.7855, lng: 11.8635, address: 'Route Nationale 1', city: 'Pointe-Noire' },
    avatar: 'https://picsum.photos/200/200?random=3',
    joinedDate: '2024-11-05',
    status: 'Active',
    trainingProgress: 75,
    badges: ['Leader Communautaire'],
    role: 'MEMBER',
    completedTrainings: ['t1', 't2', 't3']
  }
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    authorId: '1',
    content: "Bonjour à toutes ! Nous organisons un achat groupé d'emballages en verre pour la conservation des épices. La mutualisation des efforts nous permettra de réduire les coûts de 20%. Qui est intéressée ?",
    type: 'Besoin',
    likes: 12,
    comments: 5,
    timestamp: 'Il y a 2 heures',
    image: 'https://picsum.photos/600/300?random=10',
    likedBy: []
  },
  {
    id: 'p2',
    authorId: '2',
    content: "J'ai des difficultés avec la gestion de ma trésorerie. Je confonds souvent mon capital et mon chiffre d'affaires. Quelqu'un a des conseils ou un outil simple ?",
    type: 'Question',
    likes: 8,
    comments: 14,
    timestamp: 'Il y a 5 heures',
    likedBy: []
  },
  {
    id: 'p3',
    authorId: '3',
    content: "Grande nouvelle ! Notre coopérative vient d'obtenir le financement grâce à la formalisation de nos statuts. Merci au Cluster pour l'accompagnement sur les normes !",
    type: 'Succès',
    likes: 45,
    comments: 10,
    timestamp: 'Hier',
    likedBy: []
  }
];

export const MOCK_TRAININGS: TrainingResource[] = [
  {
    id: 't1',
    title: 'Gestion de Trésorerie Simplifiée',
    description: 'Comprendre la différence entre capital et chiffre d\'affaires pour éviter la faillite.',
    type: 'VIDEO',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample public video
    duration: '12 min',
    dateAdded: '10 Jan 2025',
    authorName: 'Cluster Admin'
  },
  {
    id: 't2',
    title: 'Guide des Normes de Standardisation',
    description: 'Document complet sur les normes d\'emballage et de conservation des produits agroalimentaires.',
    type: 'PDF',
    url: 'https://pdfobject.com/pdf/sample.pdf', // Sample public PDF
    duration: '25 pages',
    dateAdded: '15 Jan 2025',
    authorName: 'Bureau Technique'
  },
  {
    id: 't3',
    title: 'Podcast: Témoignage Réussite',
    description: 'Interview avec Mme. Bakala sur l\'exportation des épices.',
    type: 'AUDIO',
    url: 'https://www.w3schools.com/html/horse.mp3', // Sample audio
    duration: '18 min',
    dateAdded: '20 Jan 2025',
    authorName: 'PR-CONNEXION'
  },
  {
    id: 't4',
    title: 'Site du Ministère des PME',
    description: 'Lien vers les opportunités de subventions actuelles.',
    type: 'LINK',
    url: 'https://www.google.com',
    dateAdded: '22 Jan 2025',
    authorName: 'Secrétariat'
  }
];

export const CLUSTER_INFO = {
  mission: "Autonomiser et professionnaliser les femmes entrepreneures.",
  startDate: "Janvier 2026",
  objectives: [
    "Renforcer les capacités techniques",
    "Créer un cadre de collaboration",
    "Faciliter l'accès aux marchés"
  ]
};