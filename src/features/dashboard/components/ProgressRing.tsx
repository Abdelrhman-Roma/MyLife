export function ProgressRing({ value, size = 52, color = 'var(--blue)' }: { value: number; size?: number; color?: string }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const percent = Math.max(0, Math.min(100, value))
  return (
    <svg className="progress-ring" width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)} transform="rotate(-90 22 22)" />
    </svg>
  )
}
