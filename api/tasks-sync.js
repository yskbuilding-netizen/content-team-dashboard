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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientTasks = req.body.tasks || [];
    const serverTasks = await kv.get(TASKS_KV_KEY) || [];
    const serverIds = new Set(serverTasks.map(t => t.id));

    let added = 0;
    clientTasks.forEach(t => {
      if (!serverIds.has(t.id)) {
        serverTasks.push(t);
        added++;
      }
    });

    if (added > 0) {
      await kv.set(TASKS_KV_KEY, serverTasks);
    }

    res.json({ ok: true, tasks: serverTasks, added });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
}
