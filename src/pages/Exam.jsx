import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard.jsx'
import { buildSession } from '../lib/examEngine'
import { recordAnswer, recordExamCompletion, getExamDurationMinutes } from '../lib/history'
import { getLanguage } from '../lib/language'
import { getDeviceId } from '../lib/device'
import { getTrack } from '../lib/tracks'

function logExamAnonymously(trackId, score, total, mode) {
  // Best-effort, fire-and-forget: never blocks or breaks the exam UX.
  try {
    fetch('/api/log-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), track: trackId, score, total, mode }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore - e.g. fetch unavailable in some embedded webview
  }
}

const MODE_LABELS = {
  exam: 'Real Exam',
  practice: 'Practice',
  wrong: 'Wrong Questions',
}

// Only "Start Exam" simulates real timed conditions. Practice and Wrong
// Questions stay untimed since their point is relaxed, thorough review.
const TIMED_MODES = new Set(['exam'])

function fmtClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Exam() {
  const { trackId, mode } = useParams()
  const track = getTrack(trackId)
  const navigate = useNavigate()
  const location = useLocation()

  // location.key changes on every navigation (even to the same path), so
  // using it here lets "Start Another Exam" force a fresh random session
  // (and recompute the time limit from your latest readiness score).
  const questions = useMemo(() => buildSession(trackId, mode), [trackId, mode, location.key])
  const lang = useMemo(() => (track.hasLanguages ? getLanguage() : 'rw'), [track.hasLanguages])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null))

  const isTimed = TIMED_MODES.has(mode)
  const durationMinutes = useMemo(
    () => (isTimed ? getExamDurationMinutes(trackId) : null),
    [isTimed, trackId, location.key],
  )
  const [secondsLeft, setSecondsLeft] = useState(() => (isTimed ? durationMinutes * 60 : null))
  const finishedRef = useRef(false)

  function finishExam(finalAnswers) {
    if (finishedRef.current) return
    finishedRef.current = true
    const finalScore = finalAnswers.filter((a) => a && a.correct).length
    recordExamCompletion(trackId, finalScore, questions.length, mode)
    logExamAnonymously(trackId, finalScore, questions.length, mode)
    const payload = { trackId, questions, answers: finalAnswers, score: finalScore, total: questions.length, mode }
    sessionStorage.setItem('provisoire_last_result', JSON.stringify(payload))
    navigate(`/t/${trackId}/results`, { state: payload })
  }

  useEffect(() => {
    if (!isTimed || questions.length === 0) return
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          finishExam(answers)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimed, questions.length, answers])

  if (questions.length === 0) {
    return (
      <div className="page">
        <h1>{MODE_LABELS[mode] || 'Exam'}</h1>
        <p>No questions available for this mode yet.</p>
        <button className="btn" onClick={() => navigate(`/t/${trackId}`)}>
          Back to dashboard
        </button>
      </div>
    )
  }

  const current = questions[index]
  const currentAnswer = answers[index]
  const answeredCount = answers.filter(Boolean).length
  const score = answers.filter((a) => a && a.correct).length

  function handleSelect(optionIndex) {
    if (currentAnswer) return
    const opt = current.options[optionIndex]
    const isCorrect = !!opt.correct
    const next = [...answers]
    next[index] = { index: optionIndex, correct: isCorrect }
    setAnswers(next)
    recordAnswer(trackId, current.id, isCorrect)
  }

  function handleNext() {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      return
    }
    finishExam(answers)
  }

  const isLast = index + 1 === questions.length

  return (
    <div className="page exam-page">
      <div className="exam-header">
        <h2>
          Question {index + 1} / {questions.length}
        </h2>
        <div className="exam-header-right">
          {isTimed && (
            <div className={`timer-badge ${secondsLeft <= 60 ? 'timer-badge-warning' : ''}`}>
              {fmtClock(secondsLeft)}
            </div>
          )}
          <div className="score-badge">
            Score: {score} / {answeredCount}
          </div>
        </div>
      </div>

      <QuestionCard
        question={current}
        selectedIndex={currentAnswer ? currentAnswer.index : null}
        onSelect={handleSelect}
        interactive={true}
        lang={lang}
      />

      {currentAnswer && (
        <div className="exam-footer">
          <button className="btn btn-primary" onClick={handleNext}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}
