import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import AdminNav from '@/components/admin/AdminNav'

export const metadata: Metadata = {
  title: 'Back-office · everlease',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <AdminNav name={admin.name} email={admin.email} />
      <main style={{ marginLeft: 220 }}>{children}</main>
    </div>
  )
}
