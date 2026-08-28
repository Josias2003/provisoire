import { useNavigate, useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { getStatsSummary, getReadiness, getExamDurationMinutes } from '../lib/history'
import { getSelectableQuestions, getAllQuestions } from '../lib/examEngine'
import { getLanguage, setLanguage } from '../lib/language'
import { getTrack } from '../lib/tracks'

function fmtPct(v) {
  return v == null ? '—' : `${v.toFixed(0)}%`
}

const READINESS_COLOR = {
  Ready: '#1f9d55',
  'Almost Ready': '#c98a12',
  'Not Ready Yet': '#d64545',
  'Not enough data yet': '#8a8f98',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { trackId } = useParams()
  const track = getTrack(trackId)
  const stats = getStatsSummary(trackId)
  const readiness = getReadiness(trackId)
  const total = getAllQuestions(trackId).length
  const selectable = getSelectableQuestions(trackId).length
  const [lang, setLang] = useState(getLanguage())
  const examMinutes = getExamDurationMinutes(trackId)

  function chooseLanguage(l) {
    setLanguage(l)
    setLang(l)
  }

  return (
    <div className="page dashboard">
      <Link to="/" className="back-link">
        ← All exams
      </Link>
      <h1>{track.name.toUpperCase()}</h1>
      <p className="subtitle">
        {selectable} questions available
        {total - selectable > 0 ? ` (${total - selectable} flagged for manual review, excluded)` : ''} &middot;
        pass mark {track.passMark}/{track.examTotal}
      </p>

      {track.hasLanguages && (
        <div className="lang-toggle">
          <span className="lang-toggle-label">Question language:</span>
          <button
            className={`lang-btn ${lang === 'rw' ? 'lang-btn-active' : ''}`}
            onClick={() => chooseLanguage('rw')}
          >
            Kinyarwanda
          </button>
          <button
            className={`lang-btn ${lang === 'en' ? 'lang-btn-active' : ''}`}
            onClick={() => chooseLanguage('en')}
          >
            English
          </button>
        </div>
      )}

      {track.references && (
        <div className="law-notice" style={{ background: '#eef4ff', borderColor: '#b8cef7', color: '#1a3a6b' }}>
          <strong>What this content is:</strong> original practice questions written from general,
          well-established domain knowledge — not sourced from any vendor's copyrighted exam content, and not
          affiliated with or endorsed by CompTIA or any certifying body. The style name (e.g. "Network+ style")
          only describes the topic area. Verify anything here against the primary sources below, and treat
          official vendor study material as the authority for the real exam.
          <div style={{ marginTop: 8 }}>
            <strong>Sources:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {track.references.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {track.hasLawNotice && (
        <div className="law-notice">
          <strong>Heads up:</strong> Rwanda's road traffic law changed on 10 March 2026 (Law N&deg;
          014/2026), replacing the 1987 code this question bank is sourced from. Signs, right-of-way and
          general driving-conduct questions are likely still accurate, but{' '}
          <strong>numeric limits (speed, weight, distance) may be outdated</strong> — confirm current figures
          with your driving school before relying on them.
        </div>
      )}

      <div className="menu">
        <button className="btn btn-primary" onClick={() => navigate(`/t/${trackId}/exam/exam`)}>
          Start Exam <span className="btn-sub">({examMinutes} min)</span>
        </button>
        <button className="btn" onClick={() => navigate(`/t/${trackId}/exam/practice`)}>
          Practice
        </button>
        <button
          className="btn"
          onClick={() => navigate(`/t/${trackId}/exam/wrong`)}
          disabled={stats.totalWrong === 0}
        >
          Wrong Questions
        </button>
      </div>
      <p className="stats-footnote" style={{ marginTop: -10, marginBottom: 20 }}>
        Time limit scales with your readiness: 25 min least-ready → 15 min most-ready.
      </p>

      <div className="readiness-panel" style={{ borderColor: READINESS_COLOR[readiness.label] }}>
        <h2>Exam Readiness</h2>
        {!readiness.hasData ? (
          <p className="stats-footnote">
            Complete at least one <strong>Start Exam</strong> run to see your readiness score.
          </p>
        ) : (
          <>
            <div className="readiness-top">
              <div className="readiness-score" style={{ color: READINESS_COLOR[readiness.label] }}>
                {readiness.readinessScore}
                <span className="readiness-score-max">/100</span>
              </div>
              <div>
                <div className="readiness-label" style={{ color: READINESS_COLOR[readiness.label] }}>
                  {readiness.label}
                </div>
                <div className="stats-footnote" style={{ margin: 0 }}>
                  Based on your last {readiness.recentCount} exam{readiness.recentCount === 1 ? '' : 's'} —
                  if you sat the exam right now, you'd likely score around{' '}
                  <strong>
                    {readiness.estimatedScoreOnTotal}/{track.examTotal}
                  </strong>
                  .
                </div>
              </div>
            </div>
            <div className="readiness-bar-track">
              <div
                className="readiness-bar-fill"
                style={{ width: `${readiness.readinessScore}%`, background: READINESS_COLOR[readiness.label] }}
              />
            </div>
            <div className="readiness-breakdown">
              <div>
                Recent exam average <strong>{fmtPct(readiness.recentAvgPct)}</strong> × 50%
              </div>
              <div>
                Pass-mark consistency <strong>{fmtPct(readiness.passRatePct)}</strong> × 30%
              </div>
              <div>
                Question bank coverage <strong>{fmtPct(readiness.coveragePct)}</strong> × 20%
              </div>
            </div>
          </>
        )}
      </div>

      <div className="stats-panel">
        <h2>Performance</h2>
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-label">Best Score</div>
            <div className="stat-value">{fmtPct(stats.bestScorePct)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Average Score</div>
            <div className="stat-value">{fmtPct(stats.averageScorePct)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Exams Completed</div>
            <div className="stat-value">{stats.examsCompleted}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Question Accuracy</div>
            <div className="stat-value">{fmtPct(stats.accuracyPct)}</div>
          </div>
        </div>
        <p className="stats-footnote">
          {stats.totalAnswered} questions answered total ({stats.totalCorrect} correct, {stats.totalWrong}{' '}
          wrong)
        </p>
      </div>
    </div>
  )
}
