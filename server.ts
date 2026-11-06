import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Accept up to 50mb base64 payload for image uploads
  app.use(express.json({ limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Mossline Video Engine',
      model: 'gemini-omni-1.2-flash',
    });
  });

  // Image-to-Video generation using Gemini Interactions API (gemini-omni-1.2-flash)
  app.post('/api/animate', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error:
            'GEMINI_API_KEY is not configured. Please ensure your paid Gemini API key is provided.',
        });
      }

      const {
        imageBase64,
        mimeType = 'image/png',
        prompt,
        aspectRatio = '16:9',
      } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data (imageBase64) is required.' });
      }

      // Strip data URI prefix if provided
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const ai = new GoogleGenAI({ apiKey });

      const textPrompt =
        prompt && typeof prompt === 'string' && prompt.trim()
          ? prompt.trim()
          : 'A cinematic drone push forward through misty mossy terrain, delicate morning dew and swaying ferns, atmospheric volumetric light';

      const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

      console.log(
        `[server] Initiating gemini-omni-1.2-flash image-to-video interaction (aspect: ${validAspect})...`
      );

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: [
            {
              type: 'image',
              mime_type: mimeType,
              data: cleanBase64,
            },
            {
              type: 'text',
              text: textPrompt,
            },
          ],
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: validAspect,
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart || !videoPart.data) {
        console.error('[server] No video data returned in interaction output:', interaction);
        return res.status(502).json({
          error: 'The model completed without returning video data.',
        });
      }

      console.log(
        `[server] Successfully received video (${videoPart.mime_type || 'video/mp4'}), length: ${videoPart.data.length}`
      );

      return res.json({
        videoData: videoPart.data,
        mimeType: videoPart.mime_type || 'video/mp4',
        aspectRatio: validAspect,
      });
    } catch (err: any) {
      console.error('[server] Gemini Omni video error:', err);
      const message =
        err?.message ||
        (typeof err === 'string' ? err : 'Internal error generating video with Gemini Omni Flash.');
      return res.status(500).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mossline server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
