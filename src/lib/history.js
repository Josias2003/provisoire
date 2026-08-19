import questions from '../../data/questions.json'

const STORAGE_KEY = 'provisoire_history_v1'
export const PASS_MARK = 12 // out of 20 - matches the real provisoire exam pass mark
export const EXAM_TOTAL = 20
const TOTAL_SELECTABLE_QUESTIONS = questions.filter((q) => !q.needsReview).length

function defaultHistory() {
  return {
    examsCompleted: 0,
    scores: [], // { date, score, total, mode }
    questionStats: {}, // id -> { attempts, correct, wrong, lastResult }
  }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultHistory()
    const parsed = JSON.parse(raw)
    return { ...defaultHistory(), ...parsed }
  } catch {
    return defaultHistory()
  }
}

export function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function recordAnswer(questionId, isCorrect) {
  const history = loadHistory()
  const stats = history.questionStats[questionId] || { attempts: 0, correct: 0, wrong: 0, lastResult: null }
  stats.attempts += 1
  if (isCorrect) stats.correct += 1
  else stats.wrong += 1
  stats.lastResult = isCorrect ? 'correct' : 'wrong'
  history.questionStats[questionId] = stats
  saveHistory(history)
  return history
}

export function recordExamCompletion(score, total, mode) {
  const history = loadHistory()
  if (mode === 'exam') {
    history.examsCompleted += 1
    history.scores.push({ date: new Date().toISOString(), score, total, mode })
  }
  saveHistory(history)
  return history
}

export function getWrongQuestionIds() {
  const history = loadHistory()
  return Object.entries(history.questionStats)
    .filter(([, s]) => s.lastResult === 'wrong')
    .map(([id]) => Number(id))
}

export function getStatsSummary() {
  const history = loadHistory()
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
 * Readiness score (0-100), built from three things that actually predict
 * exam-day performance, each expressed as a plain percentage so the math is
 * inspectable rather than a black box:
 *
 *   recentAvgPct   - average % across your last 5 "Start Exam" runs
 *                    (the closest simulation of the real thing)
 *   passRatePct    - % of those last 5 exams that hit the 12/20 pass mark
 *   coveragePct    - % of the whole question bank you've seen at least once
 *                    (across any mode) - a low score here means there are
 *                    whole topics you haven't been tested on yet
 *
 * readiness = 0.5 * recentAvgPct + 0.3 * passRatePct + 0.2 * coveragePct
 *
 * Weighted toward recent real-exam accuracy (the strongest signal), with
 * pass consistency and breadth of coverage as supporting signals.
 */
export function getReadiness() {
  const history = loadHistory()
  const examScores = history.scores.filter((s) => s.mode === 'exam')
  const recent = examScores.slice(-5)

  const attemptedCount = Object.keys(history.questionStats).length
  const coveragePct = TOTAL_SELECTABLE_QUESTIONS > 0
    ? Math.min(100, (attemptedCount / TOTAL_SELECTABLE_QUESTIONS) * 100)
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
      estimatedScoreOn20: null,
    }
  }

  const recentAvgPct = recent.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / recent.length
  const passCount = recent.filter((s) => s.score >= PASS_MARK).length
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
    estimatedScoreOn20: Math.round((recentAvgPct / 100) * EXAM_TOTAL),
  }
}

export function getQuestionStat(questionId) {
  const history = loadHistory()
  return history.questionStats[questionId] || { attempts: 0, correct: 0, wrong: 0, lastResult: null }
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}
