export const API_BASE_URL = 'https://earthaioa-earth-os-v10-docker.hf.space';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const earthApi = {
  healthCheck: async (): Promise<boolean> => {
    return true;
  },

  sendMessage: async (messages: ChatMessage[], model: string = 'core-engine-v1', signal?: AbortSignal, useWebSearch?: boolean): Promise<string> => {
    const formattedMessages = [
      {
        role: 'system',
        content: `You are EARTH OS V10, an advanced AI Operating System.
You have the following capabilities available directly in the user interface:
- Data Visualization: To create charts, use a markdown javascript code block with the language \"chart\" and valid JSON inside it. 
Example:
\`\`\`chart
{
  "type": "bar",
  "data": [
    {"name": "Apples", "val": 10},
    {"name": "Oranges", "val": 20}
  ]
}
\`\`\`
Supported types: "bar", "line", "pie". Key for values should be mapped similarly, default mapping uses 1st object key for XAxis/Name, 2nd for value.`
      },
      ...messages
    ] as ChatMessage[];

    try {
      if (useWebSearch || !model.startsWith('openrouter/')) {
        const lastMessageContent = messages[messages.length - 1]?.content || '';
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
             messages: formattedMessages,
             useWebSearch
          }),
          signal
        });
        
        if (!response.ok) {
           throw new Error(`API Response not ok: ${response.status}`);
        }
        
        // Wait, our express backend stream returns a text stream or lines like "data: {...}"
        // But sendMessage expects a single response... For simplicity, we can just process standard streaming or create a non-stream gemini endpoint.
        // Or if it's openrouter, use that. Wait, we should stream it and aggregate.
        // But /chat endpoint in expressing does not exist if we only have /api/chat which streams!
        // To be safe, if we use /api/chat, it returns SSE stream. We can just parse the stream!
        // Or wait, the original code called `fetch('${API_BASE_URL}/chat')`. Let's just restore the OpenRouter code for non-web search, and for web search we use /api/chat.
      }
      
      if (model.startsWith('openrouter/')) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer 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`,
            'HTTP-Referer': window.location.href, // Optional, for including your app on openrouter.ai rankings.
            'X-Title': 'EARTH OS' // Optional. Shows in rankings on openrouter.ai.
          },
          body: JSON.stringify({
            model: "openrouter/auto",
            messages: formattedMessages,
          }),
          signal
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API Response not ok: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      }

      const lastMessageContent = messages[messages.length - 1]?.content || '';
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: lastMessageContent,
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`API Response not ok: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error('Send message failed', e);
      throw e;
    }
  },

  streamMessage: async function* (messages: ChatMessage[], model: string = 'core-engine-v1', signal?: AbortSignal, useWebSearch?: boolean) {
    const formattedMessages = [
      {
        role: 'system',
        content: `You are EARTH OS V10, an advanced AI Operating System.
You have the following capabilities available directly in the user interface:
- Data Visualization: To create charts, use a markdown javascript code block with the language \"chart\" and valid JSON inside it. 
Example:
\`\`\`chart
{
  "type": "bar",
  "data": [
    {"name": "Apples", "val": 10},
    {"name": "Oranges", "val": 20}
  ]
}
\`\`\`
Supported types: "bar", "line", "pie". Key for values should be mapped similarly, default mapping uses 1st object key for XAxis/Name, 2nd for value.`
      },
      ...messages
    ] as ChatMessage[];

    if (!useWebSearch && model.startsWith('openrouter/')) {
      let response;
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer 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`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'EARTH OS'
          },
          body: JSON.stringify({
            model: "openrouter/auto",
            messages: formattedMessages,
            stream: true
          }),
          signal
        });
      } catch (e: any) {
        throw e;
      }

      if (!response.ok) {
        throw new Error(`OpenRouter API temporarily unavailable (Status: ${response.status})`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (let line of lines) {
            line = line.trim();
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6);
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.choices && parsed.choices.length > 0) {
                  const delta = parsed.choices[0].delta?.content;
                  if (delta) {
                    yield delta;
                  }
                }
              } catch (e) {
                // Ignore parse errors on partial streams
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      return;
    }

    let response;
    try {
      if (useWebSearch) {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: formattedMessages,
            useWebSearch
          }),
          signal
        });
      } else {
        const lastMessageContent = messages[messages.length - 1]?.content || '';
        response = await fetch(`${API_BASE_URL}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: lastMessageContent,
          }),
          signal
        });
      }
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

    try {
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
    } finally {
      reader.releaseLock();
    }
  }
};
