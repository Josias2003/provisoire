import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard.jsx'
import Confetti from '../components/Confetti.jsx'
import { getLanguage } from '../lib/language'
import { getTrack } from '../lib/tracks'

const MODE_LABELS = {
  exam: 'Real Exam',
  practice: 'Practice',
  wrong: 'Wrong Questions',
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { trackId } = useParams()
  const track = getTrack(trackId)
  const [showReview, setShowReview] = useState(false)
  const lang = track.hasLanguages ? getLanguage() : 'rw'

  let payload = location.state
  if (!payload) {
    const cached = sessionStorage.getItem('provisoire_last_result')
    if (cached) payload = JSON.parse(cached)
  }

  if (!payload) {
    return (
      <div className="page">
        <p>No recent exam result found.</p>
        <button className="btn" onClick={() => navigate(`/t/${trackId}`)}>
          Back to dashboard
        </button>
      </div>
    )
  }

  const { questions, answers, score, total, mode } = payload
  const wrong = total - score
  const pct = Math.round((score / total) * 100)
  // scale the pass mark for shorter sessions (e.g. a wrong-questions set with < 20 questions)
  const passThreshold = Math.round(track.passMark * (total / track.examTotal))
  const passed = score >= passThreshold

  return (
    <div className="page results-page">
      {passed && <Confetti />}
      <h1>SCORE</h1>
      <div className="score-hero">
        {score} / {total}
      </div>
      <p className="mode-tag">
        {track.name} · {MODE_LABELS[mode] || mode}
      </p>

      <div className={`pass-banner ${passed ? 'pass' : 'fail'}`}>
        {passed ? (
          <>🎉 Congratulations — you passed! 🎉</>
        ) : (
          <>Not quite there yet</>
        )}
        <div className="pass-banner-sub">
          {passed
            ? `You scored ${score}/${total}, above the ${passThreshold}/${total} pass mark.`
            : `You need ${passThreshold}/${total} to pass — you got ${score}/${total}, ${
                passThreshold - score
              } more correct would have done it. Keep practicing!`}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">Percentage</div>
          <div className="stat-value">{pct}%</div>
        </div>
        <div className="stat">
          <div className="stat-label">Correct</div>
          <div className="stat-value">{score}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Wrong</div>
          <div className="stat-value">{wrong}</div>
        </div>
      </div>

      <div className="menu">
        <button className="btn" onClick={() => setShowReview((v) => !v)}>
          {showReview ? 'Hide Review' : 'Review Answers'}
        </button>
        <button className="btn btn-primary" onClick={() => navigate(`/t/${trackId}/exam/${mode}`)}>
          Start Another Exam
        </button>
        <button className="btn" onClick={() => navigate(`/t/${trackId}/exam/wrong`)}>
          Practice Wrong Questions
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(`/t/${trackId}`)}>
          Dashboard
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          All exams
        </button>
      </div>

      {showReview && (
        <div className="review-list">
          {questions.map((q, i) => (
            <div key={q.id} className="review-item">
              <div className="review-item-number">
                Question {i + 1} — {answers[i]?.correct ? 'Correct' : 'Wrong'}
              </div>
              <QuestionCard question={q} selectedIndex={answers[i]?.index} interactive={false} lang={lang} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
