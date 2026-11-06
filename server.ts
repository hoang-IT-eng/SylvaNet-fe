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

  // Mock API: Real-time status of random field sensors in Station 07
  const SENSOR_CATALOG = [
    { id: 'MS-CANOPY-04', name: 'Canopy RH & Flux', zone: 'North Ridge Quad', baseReading: '71% RH', metric: '14.2°C' },
    { id: 'MS-SOIL-12', name: 'Sub-surface Peat Core', zone: 'Wetland Baseline', baseReading: '+3.8 tCO₂e/ha', metric: '6.4 pH' },
    { id: 'MS-MAST-07', name: 'AMRV Eddy Covariance', zone: 'Central Monolith', baseReading: '412.8 ppm CO₂', metric: '0.48 m/s' },
    { id: 'MS-SPECIES-02', name: 'Acoustic Bio-monitor', zone: 'Fern Understory', baseReading: '214 taxa', metric: 'Bio-index 8.4' },
    { id: 'MS-MICRO-19', name: 'Microclimate Dendro', zone: 'South Crevice', baseReading: '13.8°C', metric: '82% Soil Sat' },
    { id: 'MS-SPORE-05', name: 'Optical Spore Counter', zone: 'Lichen Crest', baseReading: '38 pts/m³', metric: 'Solar 840 W/m²' },
    { id: 'MS-HYDRO-08', name: 'Stemflow Hydro-gauge', zone: 'Basal Moss Wall', baseReading: '1.2 mm/hr', metric: 'Temp 12.6°C' },
  ];

  app.get('/api/sensors/status', (_req, res) => {
    // Randomize telemetry slightly each request to simulate live telemetry
    const now = new Date();
    const sensors = SENSOR_CATALOG.map((s, index) => {
      // Deterministically keep most online, with a chance of offline for 1 sensor
      const isOffline = (index === 3 && Math.random() > 0.4) || (index === 6 && Math.random() > 0.7);
      const battery = isOffline ? Math.floor(12 + Math.random() * 8) : Math.floor(75 + Math.random() * 24);
      const latencyMs = isOffline ? Math.floor(1200 + Math.random() * 800) : Math.floor(14 + Math.random() * 35);
      
      return {
        id: s.id,
        name: s.name,
        zone: s.zone,
        status: isOffline ? 'offline' : 'online',
        reading: s.baseReading,
        metric: s.metric,
        battery,
        latencyMs,
        lastPing: isOffline ? `${Math.floor(2 + Math.random() * 15)}m ago` : `${Math.floor(1 + Math.random() * 5)}s ago`,
      };
    });

    const onlineCount = sensors.filter(s => s.status === 'online').length;
    res.json({
      timestamp: now.toISOString(),
      stationId: 'STATION-07-ALTO',
      meshHealth: `${((onlineCount / sensors.length) * 100).toFixed(1)}%`,
      activeCount: onlineCount,
      totalCount: sensors.length,
      sensors,
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
