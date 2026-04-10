export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export type Role = 'owner' | 'editor' | 'viewer';

export interface Trip {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: Record<string, Role>;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidBy: string;
  paidByUids?: string[]; // for multi-payer backward/forward compatibility
  paidByMap?: Record<string, number>;
  splitAmong: string[];
  splitMode: 'equal' | 'extras' | 'exact';
  exactSplits?: Record<string, number>;
  extras?: Record<string, number>;
  paidStatus: Record<string, boolean>;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface TimelineEvent {
  id: string;
  tripId: string;
  title: string;
  description: string;
  startTime: any; // Firestore Timestamp
  endTime?: any; // Firestore Timestamp
  location: string;
  mapLink: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Idea {
  id: string;
  tripId: string;
  title: string;
  description: string;
  link: string;
  votes: string[];
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Activity {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: any;
}
