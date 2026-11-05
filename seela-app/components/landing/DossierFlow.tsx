'use client'

// Trajet du dossier : le dossier part vers trois financeurs anonymes
// (A · Banque, B · Loueur spécialisé, C · Loueur indépendant), puis des
// réponses reviennent. Arcs SVG tracés en stroke-dashoffset (1 400 ms,
// décalés de 160 ms), nœuds en HTML pour rester éditables et accessibles.
// Tout est piloté par la classe `.in` posée à l'apparition.
import React from 'react'
import { useInView } from './useInView'

export default function DossierFlow() {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  return (
    <div
      id="flow"
      ref={ref}
      className={inView ? 'flow in' : 'flow'}
      role="img"
      aria-label="Le dossier part vers plusieurs financeurs anonymes, puis des réponses reviennent"
    >
      <svg className="flow__svg" viewBox="0 0 640 420" preserveAspectRatio="none" aria-hidden="true">
        <path className="p1" d="M160 210 C 260 210, 300 90, 420 90" />
        <path className="p2" d="M160 210 C 260 210, 300 210, 420 210" />
        <path className="p3" d="M160 210 C 260 210, 300 330, 420 330" />
        <path className="back p1" d="M420 104 C 300 104, 260 224, 160 224" />
        <path className="back p2" d="M420 224 C 300 224, 260 224, 160 224" />
        <path className="back p3" d="M420 344 C 300 344, 260 224, 160 224" />
      </svg>
      <div className="node node--you">
        <div className="t">Votre dossier</div>
        <div className="s">Devis lu · pièces réunies</div>
      </div>
      <div className="node node--ever">
        <div className="t">everlease</div>
        <div className="s">prépare et présente</div>
      </div>
      <div className="node node--f1">
        <div className="t">Financeur A</div><div className="s">Banque</div>
        <div className="ans">Réponse reçue</div>
      </div>
      <div className="node node--f2">
        <div className="t">Financeur B</div><div className="s">Loueur spécialisé</div>
        <div className="ans">Réponse reçue</div>
      </div>
      <div className="node node--f3">
        <div className="t">Financeur C</div><div className="s">Loueur indépendant</div>
        <div className="ans">Réponse reçue</div>
      </div>
      <div className="flow__legend">Schéma de principe. Les financeurs décident. Exemple illustratif.</div>
    </div>
  )
}
