import { Routes, Route, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Exam from './pages/Exam.jsx'
import Results from './pages/Results.jsx'
import SecretStats from './pages/SecretStats.jsx'

// Keying Exam by location.key forces a full remount on every navigation to
// /exam/:mode (even repeats of the same mode), so "Start Another Exam" and
// re-entering practice/wrong-questions always builds a fresh random session.
function KeyedExam() {
  const location = useLocation()
  return <Exam key={location.key} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/exam/:mode" element={<KeyedExam />} />
      <Route path="/results" element={<Results />} />
      {/* No secret is stored in this public repo or the client bundle: the
          key in the URL is checked server-side by /api/stats, so this route
          pattern alone reveals nothing about what the real key is. */}
      <Route path="/stats/:key" element={<SecretStats />} />
    </Routes>
  )
}
