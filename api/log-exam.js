import { kv } from '@vercel/kv'

const LOG_KEY = 'provisoire:exam_logs'
const MAX_LOGS = 5000 // keep the list bounded; oldest entries drop off

/**
 * Silent, best-effort exam-completion logger. Called by every browser that
 * finishes an exam in the app - no auth, no accounts, since it only ever
 * appends an anonymous record (deviceId + score, nothing identifying).
 * Reading this data back requires the secret key (see stats.js).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const body = req.body || {}
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 64) : null
  const score = Number(body.score)
  const total = Number(body.total)
  const mode = typeof body.mode === 'string' ? body.mode.slice(0, 20) : 'unknown'
  const track = typeof body.track === 'string' ? body.track.slice(0, 40) : 'provisoire'

  if (!deviceId || !Number.isFinite(score) || !Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: 'invalid payload' })
  }

  const record = {
    deviceId,
    track,
    score,
    total,
    mode,
    country: req.headers['x-vercel-ip-country'] || null,
    city: req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : null,
    ts: Date.now(),
  }

  try {
    await kv.rpush(LOG_KEY, JSON.stringify(record))
    await kv.ltrim(LOG_KEY, -MAX_LOGS, -1)
  } catch (err) {
    // Never let logging failures break the exam UX for the person taking it.
    console.error('log-exam kv error', err)
  }

  return res.status(200).json({ ok: true })
}
