import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: 220 }}>
        {children}
      </main>
    </div>
  )
}
