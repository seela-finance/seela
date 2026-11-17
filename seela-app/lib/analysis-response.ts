// Lecture de la réponse de l'IA pour l'analyse d'un devis ou d'une facture (app/api/analyze).
// L'IA remplit un outil au schéma imposé : l'API renvoie un objet déjà lu, sans JSON à reconstruire
// à la main (un guillemet dans une description ou une réponse coupée faisaient échouer l'analyse).
import { ClientActionError } from '@/lib/client-workflow'

export const ANALYSIS_TOOL_NAME = 'enregistrer_analyse'

const nullable = (type: 'string' | 'number') => ({ type: [type, 'null'] })

/** Schéma de l'outil : même format que celui lu par parseAnalysis (lib/draft-workflow.ts). */
export const ANALYSIS_TOOL = {
  name: ANALYSIS_TOOL_NAME,
  description: 'Enregistre les informations extraites du document commercial.',
  input_schema: {
    type: 'object' as const,
    properties: {
      document_kind: { type: ['string', 'null'], enum: ['devis', 'facture', null] },
      supplier: {
        type: ['object', 'null'],
        properties: { name: nullable('string'), address: nullable('string'), siren: nullable('string') },
      },
      document_number: nullable('string'),
      document_date: { ...nullable('string'), description: 'Format YYYY-MM-DD' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: nullable('string'),
            quantity: nullable('number'),
            unit_price: nullable('number'),
            total_price: nullable('number'),
            equipment_type: nullable('string'),
          },
          required: ['description', 'quantity', 'unit_price', 'total_price', 'equipment_type'],
        },
      },
    },
    required: ['document_kind', 'supplier', 'document_number', 'document_date', 'items'],
  },
}

type Block = { type: string; name?: string; input?: unknown; text?: string }

export const TRUNCATED_MESSAGE =
  'Ce document est trop long pour être analysé en une fois. Envoyez un devis plus court (par exemple une page par lot), ou contactez-nous.'

/** Réponse du modèle → objet à passer à parseAnalysis. Une réponse coupée donne un message clair au client. */
export function readAnalysisResponse(message: { content: Block[]; stop_reason: string | null }): unknown {
  if (message.stop_reason === 'max_tokens') throw new ClientActionError(TRUNCATED_MESSAGE, 422)

  const tool = message.content.find(b => b.type === 'tool_use' && b.name === ANALYSIS_TOOL_NAME)
  if (tool) return tool.input

  // Repli : réponse en texte (ancien format)
  const text = message.content.find(b => b.type === 'text')?.text ?? ''
  const json = text.match(/\{[\s\S]*\}/)
  if (!json) throw new Error('No analysis in response')
  return JSON.parse(json[0])
}
