import { kv } from '@vercel/kv';

const TASKS_KV_KEY = 'content-team:tasks';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const id = req.query.id;

  try {
    if (req.method === 'PUT') {
      const tasks = await kv.get(TASKS_KV_KEY) || [];
      const idx = tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        Object.assign(tasks[idx], req.body, { id });
        await kv.set(TASKS_KV_KEY, tasks);
        res.json({ ok: true, task: tasks[idx] });
      } else {
        res.status(404).json({ error: 'not found' });
      }
    } else if (req.method === 'DELETE') {
      const tasks = await kv.get(TASKS_KV_KEY) || [];
      const filtered = tasks.filter(t => t.id !== id);
      await kv.set(TASKS_KV_KEY, filtered);
      res.json({ ok: true, total: filtered.length });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
