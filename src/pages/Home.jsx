import { useNavigate } from 'react-router-dom'
import { TRACKS } from '../lib/tracks'
import { getReadiness } from '../lib/history'

const READINESS_COLOR = {
  Ready: '#1f9d55',
  'Almost Ready': '#c98a12',
  'Not Ready Yet': '#d64545',
  'Not enough data yet': '#8a8f98',
}

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <h1>PICK YOUR EXAM</h1>
      <p className="subtitle">Practice tracks with immediate feedback, timed exams, and a readiness score for each.</p>

      <div className="track-list">
        {TRACKS.map((t) => {
          const readiness = getReadiness(t.id)
          return (
            <button key={t.id} className="track-card" onClick={() => navigate(`/t/${t.id}`)}>
              <div className="track-card-top">
                <div>
                  <div className="track-card-name">{t.name}</div>
                  <div className="track-card-subtitle">{t.subtitle}</div>
                </div>
                <span
                  className="track-card-badge"
                  style={{ color: READINESS_COLOR[readiness.label], borderColor: READINESS_COLOR[readiness.label] }}
                >
                  {readiness.hasData ? `${readiness.readinessScore}/100` : 'New'}
                </span>
              </div>
              <p className="track-card-desc">{t.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
