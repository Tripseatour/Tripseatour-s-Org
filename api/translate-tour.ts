import { GoogleGenAI } from '@google/genai';

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

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (apiKey && !apiKey.includes('MY_GEMINI_API_KEY')) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

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

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const responseText = aiResponse.text || '';
        const cleanJson = responseText.replace(/```json\s*|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        result = { ...result, ...parsed };
      } catch (aiErr) {
        console.warn('AI translation warning, using fallback translation format:', aiErr);
        result.titleEN = titleTH;
        result.titleZH = titleTH;
        result.titleRU = titleTH;
        result.descEN = descTH || '';
        result.descZH = descTH || '';
        result.descRU = descTH || '';
      }
    } else {
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
