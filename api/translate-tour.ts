import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { safeParseLlmJson } from '../src/utils/llmJsonParser';

function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  const addKey = (k?: string) => {
    if (!k || typeof k !== 'string') return;
    k.split(/[\n,]/).forEach(item => {
      const clean = item.trim();
      if (clean && !clean.includes('MY_GEMINI_API_KEY') && !keys.includes(clean)) {
        keys.push(clean);
      }
    });
  };

  addKey(process.env.GEMINI_API_KEYS);
  addKey(process.env.VITE_GEMINI_API_KEYS);
  addKey(process.env.GEMINI_API_KEY);
  addKey(process.env.VITE_GEMINI_API_KEY);
  addKey(process.env.GEMINI_API_KEY_2);
  addKey(process.env.GEMINI_API_KEY_3);
  addKey(process.env.GEMINI_API_KEY_4);
  addKey(process.env.GEMINI_API_KEY_5);

  return keys;
}

export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { titleTH, descTH, durationTH, highlightsTH, category, itinerarySteps } = body;

    if (!titleTH) {
      return res.status(400).json({ error: 'titleTH is required' });
    }

    let result: any = {
      titleEN: '',
      titleZH: '',
      titleRU: '',
      descEN: '',
      descZH: '',
      descRU: '',
      durationEN: '08:00 AM - 05:00 PM (Full Day)',
      durationZH: '08:00 - 17:00 (全天)',
      durationRU: '08:00 - 17:00 (Полный день)',
      highlightsEN: [] as string[],
      highlightsZH: [] as string[],
      highlightsRU: [] as string[],
      translatedItinerary: undefined as any
    };

    const apiKeys = getGeminiApiKeys();
    const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let translatedJsonStr = '';

    const prompt = `You are a professional travel localization assistant for Trip Sea Tour Phuket.
Translate this Thai tour listing into English (EN), Simplified Chinese (ZH), and Russian (RU).
Make the translations attractive, natural, and accurate for tourism websites.

Thai Data:
- Tour Title: "${titleTH}"
- Description: "${descTH || ''}"
- Duration: "${durationTH || 'เต็มวัน (08:00 - 17:00)'}"
- Highlights: ${JSON.stringify(highlightsTH || [])}
- Category: "${category || 'island'}"
- Itinerary Steps: ${JSON.stringify(itinerarySteps || [])}

Return ONLY valid JSON in this exact structure without markdown formatting or backticks:
{
  "titleEN": "English title",
  "titleZH": "Chinese title (Simplified)",
  "titleRU": "Russian title",
  "descEN": "English description",
  "descZH": "Chinese description",
  "descRU": "Russian description",
  "durationEN": "English duration",
  "durationZH": "Chinese duration",
  "durationRU": "Russian duration",
  "highlightsEN": ["Highlight 1", "Highlight 2"],
  "highlightsZH": ["亮点 1", "亮点 2"],
  "highlightsRU": ["Пункт 1", "Пункт 2"],
  "translatedItinerary": [
    {
      "time": "07:30 - 08:30",
      "title": { "TH": "...", "EN": "...", "ZH": "...", "RU": "..." },
      "description": { "TH": "...", "EN": "...", "ZH": "...", "RU": "..." }
    }
  ]
}`;

    if (apiKeys.length > 0) {
      keyLoop: for (let i = 0; i < apiKeys.length; i++) {
        const activeKey = apiKeys[i];
        const ai = new GoogleGenAI({
          apiKey: activeKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            },
            timeout: 25000
          }
        });

        for (const candidateModel of CANDIDATE_MODELS) {
          try {
            const config: any = {
              responseMimeType: 'application/json',
            };
            if (candidateModel.includes('3.8')) {
              config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
            }

            const aiResponse = await ai.models.generateContent({
              model: candidateModel,
              contents: prompt,
              config,
            });

            if (aiResponse && aiResponse.text) {
              translatedJsonStr = aiResponse.text;
              break keyLoop;
            }
          } catch (modelErr: any) {
            console.warn(`Translation Key #${i + 1} with ${candidateModel} warning:`, modelErr?.message || modelErr);
          }
        }
      }
    }

    if (translatedJsonStr) {
      const parsed = safeParseLlmJson(translatedJsonStr, {});
      result = { ...result, ...parsed };
    } else {
      // Fallback
      result.titleEN = titleTH;
      result.titleZH = titleTH;
      result.titleRU = titleTH;
      result.descEN = descTH || '';
      result.descZH = descTH || '';
      result.descRU = descTH || '';
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Translation route error:', err);
    return res.status(500).json({ error: err?.message || 'Translation error' });
  }
}
