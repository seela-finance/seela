import EverleaseIcon from './EverleaseIcon'

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: [28, 18], md: [36, 22], lg: [48, 30] }[size]

  return (
    <div className="flex items-center gap-2.5">
      <EverleaseIcon size={s[0]} />
      <span style={{ fontSize: s[1], fontWeight: 600, color: '#0E0E0C', letterSpacing: '-0.03em', lineHeight: 1 }}>
        everlease
      </span>
    </div>
  )
}
