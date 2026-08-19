import { useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import QuestionCard from '../components/QuestionCard.jsx'
import { buildSession } from '../lib/examEngine'
import { recordAnswer, recordExamCompletion } from '../lib/history'
import { getLanguage } from '../lib/language'

const MODE_LABELS = {
  exam: 'Real Exam',
  practice: 'Practice',
  wrong: 'Wrong Questions',
}

export default function Exam() {
  const { mode } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // location.key changes on every navigation (even to the same path), so
  // using it here lets "Start Another Exam" force a fresh random session.
  const questions = useMemo(() => buildSession(mode), [mode, location.key])
  const lang = useMemo(() => getLanguage(), [])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null))

  if (questions.length === 0) {
    return (
      <div className="page">
        <h1>{MODE_LABELS[mode] || 'Exam'}</h1>
        <p>No questions available for this mode yet.</p>
        <button className="btn" onClick={() => navigate('/')}>
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
    recordAnswer(current.id, isCorrect)
  }

  function handleNext() {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      return
    }
    const finalScore = answers.filter((a) => a && a.correct).length
    recordExamCompletion(finalScore, questions.length, mode)
    const payload = { questions, answers, score: finalScore, total: questions.length, mode }
    sessionStorage.setItem('provisoire_last_result', JSON.stringify(payload))
    navigate('/results', { state: payload })
  }

  const isLast = index + 1 === questions.length

  return (
    <div className="page exam-page">
      <div className="exam-header">
        <h2>
          Question {index + 1} / {questions.length}
        </h2>
        <div className="score-badge">
          Score: {score} / {answeredCount}
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
