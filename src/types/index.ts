export type ViewState = 
  | 'chat'
  | 'search'
  | 'library'
  | 'projects'
  | 'agents'
  | 'research'
  | 'biomedical'
  | 'coding'
  | 'memory'
  | 'settings';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  attachments?: string[];
}

export interface MemoryItem {
  id: string;
  type: 'short-term' | 'long-term';
  category: 'user-profile' | 'agent-space' | 'general' | 'timeline';
  content: string;
  importance: number; // 1-10
  timestamp: Date;
  isPinned: boolean;
  tags: string[];
}
