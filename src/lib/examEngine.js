import questions from '../../data/questions.json'
import { getWrongQuestionIds } from './history'

export const EXAM_LENGTH = 20

// Questions the extractor could not confidently resolve a single correct
// answer for (see reviewIssues) are excluded from auto-selected pools so
// the app never quizzes on ambiguous source data - they remain in the data
// file for transparency, never silently deleted.
export const SELECTABLE_QUESTIONS = questions.filter((q) => !q.needsReview)

export function getAllQuestions() {
  return questions
}

export function getQuestionById(id) {
  return questions.find((q) => q.id === id)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandomQuestions(count = EXAM_LENGTH) {
  const shuffled = shuffle(SELECTABLE_QUESTIONS)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function pickWrongQuestions(count = EXAM_LENGTH) {
  const wrongIds = new Set(getWrongQuestionIds())
  const pool = SELECTABLE_QUESTIONS.filter((q) => wrongIds.has(q.id))
  const shuffled = shuffle(pool)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function buildSession(mode) {
  if (mode === 'wrong') return pickWrongQuestions(EXAM_LENGTH)
  return pickRandomQuestions(EXAM_LENGTH)
}
