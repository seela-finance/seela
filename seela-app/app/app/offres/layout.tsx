import Sidebar from '@/components/Sidebar'

export default function OffresLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      <Sidebar />
      <main className="app-main flex-1">
        {children}
      </main>
    </div>
  )
}
