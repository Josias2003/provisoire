import { TRACK_QUESTIONS } from './trackData'
import { getTrack } from './tracks'
import { getWrongQuestionIds } from './history'

// Questions the extractor/author could not confidently resolve a single
// correct answer for (see reviewIssues, Provisoire-only today) are excluded
// from auto-selected pools so the app never quizzes on ambiguous data - they
// remain in the data file for transparency, never silently deleted.
export function getAllQuestions(trackId) {
  return TRACK_QUESTIONS[trackId] || []
}

export function getSelectableQuestions(trackId) {
  return getAllQuestions(trackId).filter((q) => !q.needsReview)
}

export function getQuestionById(trackId, id) {
  return getAllQuestions(trackId).find((q) => q.id === id)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandomQuestions(trackId, count) {
  const pool = getSelectableQuestions(trackId)
  const shuffled = shuffle(pool)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function pickWrongQuestions(trackId, count) {
  const wrongIds = new Set(getWrongQuestionIds(trackId))
  const pool = getSelectableQuestions(trackId).filter((q) => wrongIds.has(q.id))
  const shuffled = shuffle(pool)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function buildSession(trackId, mode) {
  const track = getTrack(trackId)
  const count = track.examTotal
  if (mode === 'wrong') return pickWrongQuestions(trackId, count)
  return pickRandomQuestions(trackId, count)
}
