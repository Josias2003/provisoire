import { kv } from '@vercel/kv'

const LOG_KEY = 'provisoire:exam_logs'
const STATS_SECRET = process.env.STATS_SECRET

/**
 * Owner-only aggregate view: returns every logged exam grouped by anonymous
 * device ID. Requires ?key=<STATS_SECRET> - anyone hitting this endpoint
 * without the exact key (set as a Vercel env var, matching the value baked
 * into the unlisted frontend route) gets a 403, regardless of whether they
 * know the endpoint exists.
 */
export default async function handler(req, res) {
  if (!STATS_SECRET || req.query.key !== STATS_SECRET) {
    return res.status(403).json({ error: 'forbidden' })
  }

  let raw = []
  try {
    raw = await kv.lrange(LOG_KEY, 0, -1)
  } catch (err) {
    console.error('stats kv error', err)
    return res.status(500).json({ error: 'storage unavailable' })
  }

  const records = raw
    .map((r) => {
      try {
        return typeof r === 'string' ? JSON.parse(r) : r
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const byDevice = {}
  for (const r of records) {
    if (!byDevice[r.deviceId]) {
      byDevice[r.deviceId] = {
        deviceId: r.deviceId,
        country: r.country || null,
        city: r.city || null,
        firstSeen: r.ts,
        lastSeen: r.ts,
        marks: [],
      }
    }
    const d = byDevice[r.deviceId]
    d.marks.push({ track: r.track || 'provisoire', score: r.score, total: r.total, mode: r.mode, ts: r.ts })
    d.firstSeen = Math.min(d.firstSeen, r.ts)
    d.lastSeen = Math.max(d.lastSeen, r.ts)
    if (!d.country && r.country) d.country = r.country
    if (!d.city && r.city) d.city = r.city
  }

  const devices = Object.values(byDevice).sort((a, b) => b.lastSeen - a.lastSeen)

  return res.status(200).json({
    totalExams: records.length,
    totalDevices: devices.length,
    devices,
  })
}
