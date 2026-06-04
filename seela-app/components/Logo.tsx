export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: [28, 18], md: [36, 22], lg: [48, 30] }[size]

  return (
    <div className="flex items-center gap-2.5">
      <svg width={s[0]} height={s[0]} viewBox="0 0 100 100" fill="none">
        <rect width="100" height="100" rx="23" fill="#1A1A18" />
        <path d="M50 14 L65 35 L86 50 L65 65 L50 86 L35 65 L14 50 L35 35 Z" fill="#FAFAF9" />
      </svg>
      <span style={{ fontSize: s[1], fontWeight: 600, color: '#1A1A18', letterSpacing: '-0.5px', lineHeight: 1 }}>
        seela
      </span>
    </div>
  )
}
