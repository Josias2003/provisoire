import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getStatsSummary, getReadiness, getExamDurationMinutes, PASS_MARK, EXAM_TOTAL } from '../lib/history'
import { SELECTABLE_QUESTIONS, getAllQuestions } from '../lib/examEngine'
import { getLanguage, setLanguage } from '../lib/language'

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
  const stats = getStatsSummary()
  const readiness = getReadiness()
  const total = getAllQuestions().length
  const selectable = SELECTABLE_QUESTIONS.length
  const [lang, setLang] = useState(getLanguage())
  const examMinutes = getExamDurationMinutes()

  function chooseLanguage(l) {
    setLanguage(l)
    setLang(l)
  }

  return (
    <div className="page dashboard">
      <h1>PROVISOIRE EXAM SIMULATOR</h1>
      <p className="subtitle">
        {selectable} questions available ({total - selectable} flagged for manual review, excluded from
        auto-selection) &middot; pass mark {PASS_MARK}/{EXAM_TOTAL}
      </p>

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

      <div className="law-notice">
        <strong>Heads up:</strong> Rwanda's road traffic law changed on 10 March 2026 (Law N&deg;
        014/2026), replacing the 1987 code this question bank is sourced from. Signs, right-of-way and
        general driving-conduct questions are likely still accurate, but{' '}
        <strong>numeric limits (speed, weight, distance) may be outdated</strong> — confirm current figures
        with your driving school before relying on them.
      </div>

      <div className="menu">
        <button className="btn btn-primary" onClick={() => navigate('/exam/exam')}>
          Start Exam <span className="btn-sub">({examMinutes} min)</span>
        </button>
        <button className="btn" onClick={() => navigate('/exam/practice')}>
          Practice
        </button>
        <button
          className="btn"
          onClick={() => navigate('/exam/wrong')}
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
                  if you sat the real exam right now, you'd likely score around{' '}
                  <strong>{readiness.estimatedScoreOn20}/{EXAM_TOTAL}</strong>.
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
