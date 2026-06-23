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
}
