import { useEffect, useState } from 'react'

const COLORS = ['#2f6fed', '#1f9d55', '#e8b800', '#d64545', '#8a4fd6', '#00b3a4']

function makePieces(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.4,
    duration: 2.4 + Math.random() * 1.6,
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 120,
    size: 6 + Math.random() * 6,
  }))
}

/** Lightweight, dependency-free confetti burst. Unmounts itself after playing. */
export default function Confetti({ duration = 4000 }) {
  const [visible, setVisible] = useState(true)
  const [pieces] = useState(() => makePieces(70))

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(t)
  }, [duration])

  if (!visible) return null

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 0.4,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
