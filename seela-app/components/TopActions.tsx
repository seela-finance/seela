'use client'

export default function TopActions() {
  return (
    <div className="ml-auto flex items-center gap-0.5">
      <button
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: '#9A9A93' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F5F5F4')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6.5 6C6.5 5.17 7.17 4.5 8 4.5s1.5.67 1.5 1.5C9.5 7 8 7.5 8 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.6" fill="currentColor" />
        </svg>
      </button>
      <div className="relative">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: '#9A9A93' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F5F5F4')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 2a4 4 0 00-4 4v2L2.5 11h11L12 8V6a4 4 0 00-4-4ZM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span
          className="absolute top-1 right-1 w-2 h-2 rounded-full border border-white"
          style={{ background: '#4F46E5' }}
        />
      </div>
    </div>
  )
}
