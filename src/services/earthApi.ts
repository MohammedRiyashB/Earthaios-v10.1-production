export const API_BASE_URL = 'https://earthaioa-earth-os-v10-docker.hf.space';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const earthApi = {
  healthCheck: async (): Promise<boolean> => {
    return true;
  },

  sendMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      const lastMessageContent = messages[messages.length - 1]?.content || '';
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: lastMessageContent,
        })
      });

      if (!response.ok) {
        throw new Error(`API Response not ok: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (e) {
      console.error('Send message failed', e);
      throw e;
    }
  },

  streamMessage: async function* (messages: ChatMessage[]) {
    const lastMessageContent = messages[messages.length - 1]?.content || '';
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: lastMessageContent,
        })
      });
    } catch (e: any) {
      throw e;
    }

    if (!response.ok) {
      throw new Error(`EARTH AI temporarily unavailable (Status: ${response.status})`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      
      if (chunk.includes('data:') || chunk.startsWith('{') || buffer.length > 0) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              yield parsed.response !== undefined ? parsed.response : dataStr;
            } catch {
              yield dataStr;
            }
          } else {
            try {
              const parsed = JSON.parse(line);
              yield parsed.response !== undefined ? parsed.response : line;
            } catch {
              yield line;
            }
          }
        }
      } else {
        yield chunk;
      }
    }

    if (buffer.trim()) {
      const line = buffer.trim();
      if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            yield parsed.response !== undefined ? parsed.response : dataStr;
          } catch {
            yield dataStr;
          }
        }
      } else {
        try {
          const parsed = JSON.parse(line);
          yield parsed.response !== undefined ? parsed.response : line;
        } catch {
          yield line;
        }
      }
    }
  }
};
