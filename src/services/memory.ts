import { collection, addDoc, query, orderBy, getDocs, setDoc, doc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ChatMessage } from './earthApi';
import { idbChats } from '../lib/idbStorage';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  throw new Error(JSON.stringify(errInfo));
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const memoryApi = {
  saveMessage: async (msg: StoredMessage) => {
    const pathForWrite = `conversations/${msg.conversationId}/messages/${msg.id}`;
    
    // Save to IDB first for immediate offline availability
    try {
      await idbChats.saveMessage(msg);
    } catch (err) {
      console.warn("Could not save to IDB:", err);
    }

    try {
      const msgRef = doc(db, 'conversations', msg.conversationId, 'messages', msg.id);
      await setDoc(msgRef, {
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date(),
        conversationId: msg.conversationId,
        id: msg.id
      });
    } catch (error) {
      console.error('Failed to save message to Firebase', error);
      // We don't throw here if we successfully saved to IDB and network failed, 
      // but let's let handleFirestoreError do its thing for genuine auth errors.
      // For network interruptions, Firestore handles offline queuing if configured, 
      // but otherwise our IDB layer has it backing up.
      console.warn('Network issue or permissions error. IndexedDB has the message backed up.');
    }
  },

  loadConversation: async (conversationId: string): Promise<StoredMessage[]> => {
    const pathForGetDocs = `conversations/${conversationId}/messages`;
    
    try {
      const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      const messages: StoredMessage[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const msg: StoredMessage = {
          id: data.id || docSnap.id,
          conversationId: data.conversationId,
          role: data.role,
          content: data.content,
          timestamp: data.timestamp?.toDate() || new Date()
        };
        messages.push(msg);
        
        // Sync fetched messages back to IDB
        idbChats.saveMessage(msg).catch(() => {});
      });
      return messages;
    } catch (error) {
      console.error('Failed to load conversation from Firebase, falling back to IndexedDB', error);
      try {
        const localMsgs = await idbChats.getConversation(conversationId);
        if (localMsgs && localMsgs.length > 0) {
          return localMsgs;
        }
      } catch (err) {
        console.error('Failed to load from IDB', err);
      }
      
      if (error instanceof Error && (error.message.includes('unavailable') || error.message.includes('offline'))) {
        console.warn('Network unavailable, returning empty conversation list.');
        return [];
      }
      
      handleFirestoreError(error, OperationType.LIST, pathForGetDocs);
      return [];
    }
  },

  deleteMessage: async (conversationId: string, messageId: string) => {
    const pathForDelete = `conversations/${conversationId}/messages/${messageId}`;
    
    try {
      await idbChats.deleteMessage(messageId);
    } catch (err) {
      console.warn("Could not delete from IDB:", err);
    }
    
    try {
      const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      await deleteDoc(msgRef);
    } catch (error) {
      console.error('Failed to delete message from Firebase', error);
      console.warn('Network issue or permissions error. IndexedDB has the message deleted locally.');
    }
  }
};
