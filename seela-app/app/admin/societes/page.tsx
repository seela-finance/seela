import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'

// Remplacée par la liste des sociétés du CRM
export default async function AdminCompaniesRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const q = (await searchParams).q
  const query = Array.isArray(q) ? q[0] : q
  redirect(query ? `/admin/crm/societes?q=${encodeURIComponent(query)}` : '/admin/crm/societes')
}
