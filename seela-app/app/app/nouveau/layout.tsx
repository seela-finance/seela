import Sidebar from '@/components/Sidebar'

export default function NouveauLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#FAFAF9' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: 220 }}>
        {children}
      </div>
    </div>
  )
}
