import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { text, target } = req.body as { text?: string; target?: string };
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (typeof target !== 'string' || !target.trim()) {
      return res.status(400).json({ error: 'target is required' });
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_TRANSLATE_API_KEY missing' });
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        target,
        format: 'text',
      }),
    });

    const data = (await r.json()) as any;
    const translated =
      data?.data?.translations?.[0]?.translatedText ??
      data?.translatedText ??
      null;

    if (!translated) {
      return res.status(200).json({ translatedText: text });
    }

    return res.json({ translatedText: String(translated) });
  } catch (e) {
    console.error('[translate] failed:', e);
    return res.status(200).json({ translatedText: String(req.body?.text ?? '') });
  }
});

export default router;

