import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface EarthOSDB extends DBSchema {
  settings: {
    key: string;
    value: any;
  };
  chats: {
    key: string;
    value: any;
    indexes: { 'by-conversation': string };
  };
  conversations: {
    key: string;
    value: any;
    indexes: { 'by-updated': number };
  };
}

let dbPromise: Promise<IDBPDatabase<EarthOSDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<EarthOSDB>('earth-os-db', 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('by-conversation', 'conversationId');
        }
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
};

export const idbSettings = {
  async get(key: string) {
    const db = await initDB();
    return db.get('settings', key);
  },
  async set(key: string, value: any) {
    const db = await initDB();
    return db.put('settings', value, key);
  },
};

export const idbChats = {
  async saveMessage(msg: any) {
    const db = await initDB();
    return db.put('chats', msg);
  },
  async getConversation(conversationId: string) {
    const db = await initDB();
    const index = db.transaction('chats').store.index('by-conversation');
    const msgs = await index.getAll(conversationId);
    return msgs.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  },
  async deleteMessage(id: string) {
    const db = await initDB();
    return db.delete('chats', id);
  },
  async clearAll() {
    const db = await initDB();
    return db.clear('chats');
  }
};

export const idbConversations = {
  async saveConversation(conv: any) {
    const db = await initDB();
    return db.put('conversations', conv);
  },
  async getConversations() {
    const db = await initDB();
    const index = db.transaction('conversations').store.index('by-updated');
    const convs = await index.getAll();
    return convs.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteConversation(id: string) {
    const db = await initDB();
    const deleteTx = db.transaction(['conversations', 'chats'], 'readwrite');
    await deleteTx.objectStore('conversations').delete(id);
    const chatIndex = deleteTx.objectStore('chats').index('by-conversation');
    const chatKeys = await chatIndex.getAllKeys(id);
    for (const key of chatKeys) {
      await deleteTx.objectStore('chats').delete(key);
    }
    await deleteTx.done;
  },
  async clearAll() {
    const db = await initDB();
    return db.clear('conversations');
  }
};
