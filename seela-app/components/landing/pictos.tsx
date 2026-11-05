// Douze pictogrammes filaires d'actifs (36px, trait 1.5, tracés en
// stroke-dashoffset à l'apparition) pour l'inventaire « Tout actif
// professionnel ». Les attributs de trait sont posés par le CSS `.item .pic`.
import type { ReactNode } from 'react'

export type Asset = { name: string; ex: string; pic: ReactNode }

const svg = (children: ReactNode) => (
  <svg className="pic" viewBox="0 0 36 36" aria-hidden="true">{children}</svg>
)

export const ASSETS: Asset[] = [
  { name: 'Informatique et IT', ex: 'Ordinateurs, serveurs, réseau', pic: svg(<><rect x="5" y="8" width="26" height="16" rx="2" /><path d="M3 28h30" /></>) },
  { name: 'Bureautique', ex: 'Imprimantes, copieurs, écrans', pic: svg(<><rect x="6" y="14" width="24" height="12" rx="2" /><path d="M11 14V8h14v6M11 26v4h14v-4" /></>) },
  { name: 'Matériel médical', ex: 'Imagerie, dentaire, laboratoire', pic: svg(<><path d="M10 8v8a8 8 0 0 0 16 0V8" /><path d="M18 24v4a4 4 0 0 0 8 0" /><circle cx="26" cy="28" r="2" /></>) },
  { name: 'Machines et fabrication', ex: 'CNC, robotique, impression 3D', pic: svg(<><path d="M5 30V16l8 5v-5l8 5v-5l10 6v8z" /><path d="M8 16V8h4v8" /></>) },
  { name: 'Mobilier et agencement', ex: 'Bureaux, sièges, cloisons', pic: svg(<><path d="M8 18h20v10H8z" /><path d="M11 18V9h14v9M11 28v3M25 28v3" /></>) },
  { name: 'Véhicules et flotte', ex: 'Utilitaires, engins, remorques', pic: svg(<><path d="M4 24V12h18v12M22 16h7l3 5v3" /><circle cx="10" cy="26" r="3" /><circle cx="26" cy="26" r="3" /></>) },
  { name: 'Audiovisuel et production', ex: 'Caméras, son, éclairage', pic: svg(<><rect x="5" y="11" width="18" height="14" rx="2" /><path d="M23 16l8-4v12l-8-4" /></>) },
  { name: 'CHR et restauration', ex: 'Cuisines pro, froid, mobilier', pic: svg(<><path d="M6 20h24a12 12 0 0 0-24 0z" /><path d="M4 24h28M18 8v3" /></>) },
  { name: 'BTP et outillage', ex: 'Échafaudages, engins, outils', pic: svg(<><path d="M8 28l12-12M20 8l8 8-4 4-8-8z" /><path d="M6 30l2-2" /></>) },
  { name: 'Télécom et datacenter', ex: 'Baies, switches, téléphonie', pic: svg(<><rect x="7" y="6" width="22" height="7" rx="1.5" /><rect x="7" y="15" width="22" height="7" rx="1.5" /><rect x="7" y="24" width="22" height="7" rx="1.5" /></>) },
  { name: 'Énergie et solaire', ex: 'Panneaux, bornes de recharge', pic: svg(<><path d="M6 24l4-12h16l4 12z" /><path d="M12 24v6h12v-6M10 18h16" /></>) },
  { name: 'Retail et encaissement', ex: 'TPE, vitrines, signalétique', pic: svg(<><path d="M6 14l2-6h20l2 6" /><path d="M6 14v16h24V14" /><path d="M14 30v-8h8v8" /></>) },
]
