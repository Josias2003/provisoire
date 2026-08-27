import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

function fmtDate(ts) {
  return new Date(ts).toLocaleString()
}

export default function SecretStats() {
  const { key } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [openDevice, setOpenDevice] = useState(null)

  useEffect(() => {
    fetch(`/api/stats?key=${encodeURIComponent(key)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'wrong key' : `request failed (${r.status})`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [key])

  if (error) {
    return (
      <div className="page">
        <p>Couldn't load stats: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Usage Stats</h1>
      <p className="subtitle">Anonymous, per-device only — no accounts, no personal info collected.</p>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat">
          <div className="stat-label">Total Exams Logged</div>
          <div className="stat-value">{data.totalExams}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Distinct Devices</div>
          <div className="stat-value">{data.totalDevices}</div>
        </div>
      </div>

      <div className="review-list">
        {data.devices.map((d) => (
          <div key={d.deviceId} className="question-card">
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setOpenDevice(openDevice === d.deviceId ? null : d.deviceId)}
            >
              <div>
                <strong>{d.city || d.country || 'Unknown location'}</strong>
                {d.city && d.country ? `, ${d.country}` : ''}
                <div className="stats-footnote" style={{ margin: 0 }}>
                  {d.marks.length} exam{d.marks.length === 1 ? '' : 's'} · last seen {fmtDate(d.lastSeen)} · id{' '}
                  {d.deviceId.slice(0, 8)}
                </div>
              </div>
              <span className="btn-ghost">{openDevice === d.deviceId ? 'Hide' : 'View marks'}</span>
            </div>

            {openDevice === d.deviceId && (
              <div style={{ marginTop: 14 }}>
                {d.marks
                  .slice()
                  .sort((a, b) => b.ts - a.ts)
                  .map((m, i) => (
                    <div key={i} className="option" style={{ cursor: 'default', marginBottom: 8 }}>
                      <span className="option-body">
                        <span className="option-text">
                          {m.score}/{m.total} ({m.mode}) — {fmtDate(m.ts)}
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
        {data.devices.length === 0 && <p>No exams logged yet.</p>}
      </div>
    </div>
  )
}
