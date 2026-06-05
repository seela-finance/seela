// Minimal icon set — line icons, 16px viewBox. Custom set, matches Linear/Claude vibe.
// Ported from the designer's `landing-v2.html` (only the icons the landing uses).
import type { CSSProperties, ReactNode } from 'react'

export type IconProps = {
  size?: number
  stroke?: number
  fill?: string
  style?: CSSProperties
  className?: string
}

export const Icon = ({ d, size = 16, stroke = 1.5, fill = 'none', style, className }: IconProps & { d: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    {d}
  </svg>
)

export const IconUpload = (p: IconProps) => <Icon {...p} d={<><path d="M8 10V3M5 5.5L8 2.5l3 3M3 11v1.5a1 1 0 001 1h8a1 1 0 001-1V11"/></>} />
export const IconStore = (p: IconProps) => <Icon {...p} d={<><path d="M2.5 6L3.5 3h9l1 3M2.5 6v6.5a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V6M2.5 6h11M5.5 9.5h2"/></>} />
export const IconArrowRight = (p: IconProps) => <Icon {...p} d={<><path d="M3 8h10M9.5 4.5L13 8l-3.5 3.5"/></>} />
export const IconCheck = (p: IconProps) => <Icon {...p} d={<path d="M3 8.5L6.5 12 13 4.5"/>} />
export const IconCheckSm = (p: IconProps) => <Icon {...p} stroke={2} d={<path d="M3.5 8.5L6.5 11.5 12.5 5"/>} />
export const IconClose = (p: IconProps) => <Icon {...p} d={<path d="M4 4l8 8M12 4l-8 8"/>} />
export const IconCalendar = (p: IconProps) => <Icon {...p} d={<><rect x="2.5" y="3.5" width="11" height="10" rx="1"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/></>} />
export const IconClock = (p: IconProps) => <Icon {...p} d={<><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/></>} />
export const IconShield = (p: IconProps) => <Icon {...p} d={<><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4l5-2z"/><path d="M5.5 8L7 9.5l3.5-3.5"/></>} />
export const IconLock = (p: IconProps) => <Icon {...p} d={<><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></>} />
export const IconLink = (p: IconProps) => <Icon {...p} d={<><path d="M7 9l2-2M6.5 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9.5 11.5l-1 1a2.5 2.5 0 01-3.5-3.5l1-1"/></>} />
export const IconPdf = (p: IconProps) => <Icon {...p} d={<><path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z"/><path d="M9 2v3.5a.5.5 0 00.5.5H13"/><path d="M5 9.5h1a.7.7 0 010 1.4H5v1.6M8 9.5v3.5h.7a1.2 1.2 0 001.2-1.2v-1.1a1.2 1.2 0 00-1.2-1.2H8zM11 9.5h1.5M11 11.2h1.2M11 9.5V13"/></>} />
export const IconRefresh = (p: IconProps) => <Icon {...p} d={<><path d="M2 3v3.5h3.5M14 13V9.5h-3.5M3 6.5a5.5 5.5 0 019.5-1.5M13 9.5a5.5 5.5 0 01-9.5 1.5"/></>} />
export const IconSend = (p: IconProps) => <Icon {...p} d={<><path d="M14 2L7 9M14 2l-4.5 12-2.5-5L2 6l12-4z"/></>} />
export const IconAttach = (p: IconProps) => <Icon {...p} d={<path d="M11 6.5l-4.5 4.5a2 2 0 002.8 2.8L13.5 9a3.5 3.5 0 00-5-5L3 9.5a5 5 0 007 7l3-3"/>} />
export const IconUser = (p: IconProps) => <Icon {...p} d={<><circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c0-2.5 2.2-4 5-4s5 1.5 5 4"/></>} />

// Equipment category icons
export const IconLaptop = (p: IconProps) => <Icon {...p} d={<><rect x="3" y="3.5" width="10" height="7" rx="1"/><path d="M1.5 13h13l-1-2.5h-11L1.5 13z"/></>} />
export const IconPrinter = (p: IconProps) => <Icon {...p} d={<><path d="M4 6V3h8v3M4 11.5H2.5a1 1 0 01-1-1V7a1 1 0 011-1h11a1 1 0 011 1v3.5a1 1 0 01-1 1H12"/><rect x="4" y="10" width="8" height="4" rx="0.5"/></>} />
export const IconMedical = (p: IconProps) => <Icon {...p} d={<><rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M8 5.5v5M5.5 8h5"/></>} />
export const IconFactory = (p: IconProps) => <Icon {...p} d={<><path d="M2.5 13.5V7l4 2.5V7l4 2.5V4.5a1 1 0 011-1h.5a1 1 0 011 1v9z"/><path d="M2.5 13.5h11"/></>} />
export const IconChair = (p: IconProps) => <Icon {...p} d={<><path d="M4.5 2.5v5h7v-5M4 7.5h8l-.5 4h-7L4 7.5zM5 11.5V14M11 11.5V14"/></>} />
export const IconTruck = (p: IconProps) => <Icon {...p} d={<><path d="M1.5 4.5h8v6h-8zM9.5 7h2.5l2 2v1.5h-4.5"/><circle cx="4.5" cy="11.5" r="1.3"/><circle cx="11.5" cy="11.5" r="1.3"/></>} />
export const IconCamera = (p: IconProps) => <Icon {...p} d={<><rect x="1.5" y="4.5" width="9" height="7" rx="1"/><path d="M10.5 7l4-1.5v5L10.5 9M3.5 4.5l.5-1.5h3l.5 1.5"/></>} />
export const IconTool = (p: IconProps) => <Icon {...p} d={<><path d="M9.5 3a2.5 2.5 0 00.5 3l-4 4a2.5 2.5 0 00-3 .5l2 2a2.5 2.5 0 00.5-3l4-4a2.5 2.5 0 003-.5l-2-2z"/><path d="M11 8l2.5 2.5"/></>} />
export const IconServerStack = (p: IconProps) => <Icon {...p} d={<><rect x="2.5" y="2.5" width="11" height="4" rx="1"/><rect x="2.5" y="9.5" width="11" height="4" rx="1"/><circle cx="5" cy="4.5" r="0.4" fill="currentColor"/><circle cx="5" cy="11.5" r="0.4" fill="currentColor"/></>} />
export const IconSolar = (p: IconProps) => <Icon {...p} d={<><rect x="2" y="3" width="12" height="7" rx="0.5"/><path d="M2 5.5h12M2 7.5h12M6 3v7M10 3v7M8 10v3.5M6 13.5h4"/></>} />
export const IconResto = (p: IconProps) => <Icon {...p} d={<><path d="M5 2v5a1.5 1.5 0 01-3 0V2M3.5 2v5.5M3.5 8.5V14M11 2c-1.5 0-2 1.5-2 3.5S9.5 9 11 9V2zM11 9v5"/></>} />

// 4-pointed sparkle, filled — the AI marker (looks like Claude/Linear)
export const SparkleGlyph = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <path d="M8 1.5l1.3 4.2 4.2 1.3a1 1 0 010 2l-4.2 1.3-1.3 4.2a1 1 0 01-2 0L4.7 10.3.5 9a1 1 0 010-2L4.7 5.7 6 1.5a1 1 0 012 0z" transform="translate(0.5 0.5) scale(0.95)"/>
  </svg>
)
