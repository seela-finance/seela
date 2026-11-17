import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clientRoute } from '@/lib/client-route'
import { ClientActionError } from '@/lib/client-workflow'
import { fetchOwnDocument, DocumentError } from '@/lib/documents'
import { supabaseDraftStore } from '@/lib/draft-store'
import { analyzeDraft } from '@/lib/draft-workflow'
import { EQUIPMENT_FAMILIES } from '@/lib/equipment'
import { ANALYSIS_TOOL, ANALYSIS_TOOL_NAME, readAnalysisResponse } from '@/lib/analysis-response'

// Un long devis peut demander plusieurs minutes d'analyse
export const maxDuration = 300

const client = new Anthropic()

// Les 39 types de matériel (lib/equipment.ts), par famille : l'IA choisit l'identifiant du type de chaque ligne
const EQUIPMENT_TYPES = EQUIPMENT_FAMILIES
  .map(f => `- ${f.label} : ${f.types.map(t => `"${t.slug}" (${t.examples})`).join(' ; ')}`)
  .join('\n')

const PROMPT = `Analyse ce document commercial (devis ou facture) et retourne un JSON structuré.

LIGNES À INCLURE dans "items" : matériel informatique, machines, véhicules utilitaires, équipements industriels, serveurs, mobilier professionnel — tout équipement physique avec une durée de vie amortissable.

EXCLURE impérativement des "items" : éco-participations, remises, avoirs, services, formations, garanties, maintenances, licences logicielles, frais de livraison, taxes, assurances.

Pour chaque ligne retenue dans "items" : description (string), quantité (number), prix unitaire HT (number), prix total HT (number), equipment_type (string : l'identifiant exact du type de matériel le plus proche dans la liste ci-dessous, ou null si aucun ne convient).

Types de matériel :
${EQUIPMENT_TYPES}

Extrait aussi :
- "document_kind" : "devis" si le document est un devis, une proposition commerciale ou une facture pro forma ; "facture" si c'est une facture définitive ; null si tu ne peux pas trancher (avoir, bon de commande, document illisible)
- "supplier" : l'entreprise émettrice du document (nom, adresse, numéro SIREN/SIRET si présent)
- "document_number" : le numéro de devis ou de facture (ex: DEV-2026-0142, FA-2024-00891)
- "document_date" : la date d'émission au format YYYY-MM-DD

Enregistre le résultat avec l'outil ${ANALYSIS_TOOL_NAME}, en reprenant toutes les lignes retenues, même si le document est long.
Si une valeur est absente ou non trouvée, utilise null.`

async function askClaude(db: SupabaseClient, documentUrl: string, userId: string): Promise<unknown> {
  // Le type du fichier est celui enregistré au dépôt
  const { base64, type } = await fetchOwnDocument(db, documentUrl, null, userId)
  const isPdf = type === 'application/pdf'

  const messages: MessageParam[] = [
    {
      role: 'user',
      content: [
        isPdf
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
          : { type: 'image', source: { type: 'base64', media_type: type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
        { type: 'text', text: PROMPT },
      ],
    },
  ]

  // 16 000 tokens couvrent les 200 lignes retenues au plus (lib/draft-workflow.ts)
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 16000,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: ANALYSIS_TOOL_NAME },
    messages,
  })
  if (message.stop_reason === 'max_tokens') console.error('Analyze truncated:', message.usage)
  return readAnalysisResponse(message)
}

// Analyse le document d'un brouillon et enregistre ses lignes ; le document est lu en base, jamais fourni par le navigateur.
export async function POST(req: Request) {
  const body = ((await req.json().catch(() => null)) ?? {}) as { requestId?: unknown }
  const id = typeof body.requestId === 'string' ? body.requestId : ''
  return clientRoute(id, async ({ userId, db }) => {
    try {
      return await analyzeDraft(supabaseDraftStore(db), userId, id, url => askClaude(db, url, userId))
    } catch (err) {
      if (err instanceof ClientActionError) throw err
      if (err instanceof DocumentError) throw new ClientActionError(err.message, err.status)
      console.error('Analyze error:', err)
      throw new ClientActionError('Analyse échouée, veuillez réessayer', 500)
    }
  })
}
