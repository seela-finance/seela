import { requireAdmin } from '@/lib/admin'

const NEXT_STEPS = [
  { title: 'Dossiers à traiter', detail: 'Liste des dossiers par statut, du plus ancien au plus récent.' },
  { title: 'Fiche dossier', detail: 'Document, lignes, offres et historique des actions.' },
  { title: 'Valider et transmettre', detail: 'Remplace les appels curl à validate-offer et leaser-confirms.' },
]

export default async function AdminHomePage() {
  const admin = await requireAdmin()

  return (
    <div>
      <div className="h-12 flex items-center px-6 border-b" style={{ borderColor: '#E5E5E3', background: '#fff' }}>
        <span className="text-sm font-medium" style={{ color: '#0E0E0C' }}>Dossiers</span>
      </div>

      <div className="px-6 py-8 max-w-3xl">
        <h1 className="text-xl font-semibold" style={{ color: '#0E0E0C', letterSpacing: '-0.02em' }}>
          Bonjour {admin.name}
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#9A9A93' }}>
          Back-office everlease. Chaque action sur un dossier sera enregistrée dans le journal admin.
        </p>

        <div className="mt-8 rounded-xl border divide-y" style={{ background: '#fff', borderColor: '#E5E5E3' }}>
          {NEXT_STEPS.map(step => (
            <div key={step.title} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#0E0E0C' }}>{step.title}</p>
                <p className="text-xs" style={{ color: '#9A9A93' }}>{step.detail}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F5F5F4', color: '#9A9A93' }}>
                Bientôt
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
