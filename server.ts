import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, useWebSearch } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const tools = useWebSearch ? [{ googleSearch: {} }] : undefined;
      
      // format for gemini
      const contents = messages.map((m: any) => {
        let role = m.role === 'assistant' ? 'model' : m.role;
        // fallback system to user for gemini if needed, but modern gemini accepts system instruction separately.
        return {
          role: role === 'system' ? 'user' : role,
          parts: [{ text: m.content }]
        };
      });

      // Extract system instructions if present
      let systemInstruction = undefined;
      const modelContents = contents.filter(c => {
         if (c.role === 'user' && c.parts[0].text.startsWith('You are EARTH OS V10')) {
             systemInstruction = c.parts[0].text;
             return false; // Skip this as content message
         }
         return true;
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        contents: modelContents,
        config: {
          tools,
          systemInstruction,
        }
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ response: chunk.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/stt", async (req, res) => {
    try {
      const { audioData, mimeType } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
           {
              role: 'user',
              parts: [
                 { text: "Accurately transcribe the spoken text in this audio. Output ONLY the transcription, without any extra text, tags, or markdown. If the audio is silent or unintelligible, output nothing." },
                 {
                    inlineData: {
                       data: audioData,
                       mimeType: mimeType || 'audio/webm'
                    }
                 }
              ]
           }
        ]
      });

      res.json({ text: response.text || '' });
    } catch (err: any) {
      console.error("STT Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice } = req.body;
      const { Communicate } = await import('edge-tts-universal');
      const communicate = new Communicate(text, { voice: voice || 'en-US-JennyNeural' });
      
      res.setHeader('Content-Type', 'audio/mpeg');
      for await (const chunk of communicate.stream()) {
        if (chunk.type === 'audio' && chunk.data) {
          res.write(chunk.data);
        }
      }
      res.end();
    } catch (err: any) {
      console.error("TTS Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
