import { TRACK_QUESTIONS } from './trackData'
import { getTrack } from './tracks'

// Keep the original Provisoire storage key unsuffixed so existing users'
// history isn't lost by this multi-track upgrade; every other track gets
// its own namespaced key.
function storageKey(trackId) {
  return trackId === 'provisoire' ? 'provisoire_history_v1' : `provisoire_history_v1_${trackId}`
}

function totalSelectable(trackId) {
  const qs = TRACK_QUESTIONS[trackId] || []
  return qs.filter((q) => !q.needsReview).length
}

function defaultHistory() {
  return {
    examsCompleted: 0,
    scores: [], // { date, score, total, mode }
    questionStats: {}, // id -> { attempts, correct, wrong, lastResult }
  }
}

export function loadHistory(trackId) {
  try {
    const raw = localStorage.getItem(storageKey(trackId))
    if (!raw) return defaultHistory()
    const parsed = JSON.parse(raw)
    return { ...defaultHistory(), ...parsed }
  } catch {
    return defaultHistory()
  }
}

export function saveHistory(trackId, history) {
  localStorage.setItem(storageKey(trackId), JSON.stringify(history))
}

export function recordAnswer(trackId, questionId, isCorrect) {
  const history = loadHistory(trackId)
  const stats = history.questionStats[questionId] || { attempts: 0, correct: 0, wrong: 0, lastResult: null }
  stats.attempts += 1
  if (isCorrect) stats.correct += 1
  else stats.wrong += 1
  stats.lastResult = isCorrect ? 'correct' : 'wrong'
  history.questionStats[questionId] = stats
  saveHistory(trackId, history)
  return history
}

export function recordExamCompletion(trackId, score, total, mode) {
  const history = loadHistory(trackId)
  if (mode === 'exam') {
    history.examsCompleted += 1
    history.scores.push({ date: new Date().toISOString(), score, total, mode })
  }
  saveHistory(trackId, history)
  return history
}

export function getWrongQuestionIds(trackId) {
  const history = loadHistory(trackId)
  return Object.entries(history.questionStats)
    .filter(([, s]) => s.lastResult === 'wrong')
    .map(([id]) => Number(id))
}

export function getStatsSummary(trackId) {
  const history = loadHistory(trackId)
  const examScores = history.scores.filter((s) => s.mode === 'exam')
  const best = examScores.length ? Math.max(...examScores.map((s) => (s.score / s.total) * 100)) : null
  const avg = examScores.length
    ? examScores.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / examScores.length
    : null

  const qStats = Object.values(history.questionStats)
  const totalAnswered = qStats.reduce((sum, s) => sum + s.attempts, 0)
  const totalCorrect = qStats.reduce((sum, s) => sum + s.correct, 0)
  const totalWrong = qStats.reduce((sum, s) => sum + s.wrong, 0)
  const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : null

  return {
    examsCompleted: history.examsCompleted,
    bestScorePct: best,
    averageScorePct: avg,
    totalAnswered,
    totalCorrect,
    totalWrong,
    accuracyPct: accuracy,
  }
}

/**
 * Readiness score (0-100) for a given track, built from three things that
 * actually predict exam-day performance, each expressed as a plain
 * percentage so the math is inspectable rather than a black box:
 *
 *   recentAvgPct   - average % across your last 5 "Start Exam" runs on this
 *                    track (the closest simulation of the real thing)
 *   passRatePct    - % of those last 5 exams that hit this track's pass mark
 *   coveragePct    - % of this track's whole question bank you've seen at
 *                    least once (across any mode) - a low score here means
 *                    there are whole topics you haven't been tested on yet
 *
 * readiness = 0.5 * recentAvgPct + 0.3 * passRatePct + 0.2 * coveragePct
 *
 * Weighted toward recent real-exam accuracy (the strongest signal), with
 * pass consistency and breadth of coverage as supporting signals.
 */
export function getReadiness(trackId) {
  const history = loadHistory(trackId)
  const track = getTrack(trackId)
  const examScores = history.scores.filter((s) => s.mode === 'exam')
  const recent = examScores.slice(-5)

  const totalSelectableQuestions = totalSelectable(trackId)
  const attemptedCount = Object.keys(history.questionStats).length
  const coveragePct = totalSelectableQuestions > 0
    ? Math.min(100, (attemptedCount / totalSelectableQuestions) * 100)
    : 0

  if (recent.length === 0) {
    return {
      hasData: false,
      readinessScore: 0,
      label: 'Not enough data yet',
      recentAvgPct: null,
      passRatePct: null,
      coveragePct,
      recentCount: 0,
      estimatedScoreOnTotal: null,
    }
  }

  const recentAvgPct = recent.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / recent.length
  const passCount = recent.filter((s) => s.score >= track.passMark).length
  const passRatePct = (passCount / recent.length) * 100

  const readinessScore = Math.round(0.5 * recentAvgPct + 0.3 * passRatePct + 0.2 * coveragePct)

  let label = 'Not Ready Yet'
  if (readinessScore >= 85) label = 'Ready'
  else if (readinessScore >= 65) label = 'Almost Ready'

  return {
    hasData: true,
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    label,
    recentAvgPct,
    passRatePct,
    coveragePct,
    recentCount: recent.length,
    estimatedScoreOnTotal: Math.round((recentAvgPct / 100) * track.examTotal),
  }
}

const MAX_EXAM_MINUTES = 25 // least-ready / no data yet
const MIN_EXAM_MINUTES = 15 // most-ready

/**
 * Time limit for a "Start Exam" run on this track, scaled to how ready you
 * are: 25 minutes at readiness 0 (or before any exam has been taken - err
 * generous until we know your level), down to 15 minutes at readiness 100,
 * linearly in between. More time when you need it, less when you don't.
 */
export function getExamDurationMinutes(trackId) {
  const readiness = getReadiness(trackId)
  const score = readiness.hasData ? readiness.readinessScore : 0
  const minutes = MAX_EXAM_MINUTES - (score / 100) * (MAX_EXAM_MINUTES - MIN_EXAM_MINUTES)
  return Math.round(minutes)
}

export function getQuestionStat(trackId, questionId) {
  const history = loadHistory(trackId)
  return history.questionStats[questionId] || { attempts: 0, correct: 0, wrong: 0, lastResult: null }
}

export function clearHistory(trackId) {
  localStorage.removeItem(storageKey(trackId))
}
