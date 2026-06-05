# Seela — Brief MVP pour Claude Code

## Contexte produit

Seela est une plateforme de financement locatif (leasing, LLD, lease-back) pour les professionnels. Elle permet à une entreprise d'uploader un devis ou une facture, d'analyser le document via IA, de configurer son financement, et de recevoir des offres indicatives de leasers partenaires.

**Phase actuelle : Wizard of Oz.**
Le front client est complet et fonctionnel. Le traitement côté leasers est manuel : l'équipe Seela transmet les dossiers manuellement aux partenaires financeurs. Les offres affichées au client sont indicatives et confirmées sous 48h.

---

## Stack technique

- **Frontend** : Next.js 14 (App Router, TypeScript)
- **Base de données + Auth + Storage** : Supabase
- **IA** : Claude API (Anthropic) — analyse des documents uploadés
- **Styling** : Tailwind CSS
- **Déploiement** : Vercel

---

## Structure du projet

Tout le code applicatif vit dans `seela-app/` (projet Next.js App Router). La landing n'est **plus un fichier standalone** : elle est intégrée à l'app Next.js.

```
seela-app/
├── app/
│   ├── page.tsx          # Landing page (route `/`, publique)
│   ├── landing.css       # CSS de la landing, scopé sous `.lp`
│   ├── globals.css       # CSS du reste de l'app
│   ├── layout.tsx        # Layout racine
│   ├── auth/             # Authentification (publique)
│   ├── api/              # Routes API (analyse IA, scoring, matching leasers…)
│   └── app/              # ⚠️ Partie AUTHENTIFIÉE de l'application
│       ├── layout.tsx    # Layout authentifié (sidebar, etc.)
│       ├── dashboard/    # Tableau de bord
│       ├── nouveau/      # Flow de financement
│       ├── contrats/[id] # Détail d'une demande
│       ├── offres/       # Offres
│       └── onboarding/   # Onboarding
├── components/
│   └── landing/          # Composants de la landing (LandingPage, icons, visuals)
├── lib/
└── supabase/
```

Les routes authentifiées sont donc préfixées par `/app` : `/app/dashboard`, `/app/nouveau`, `/app/contrats/[id]`, etc.

> **Note temporaire (amélioration future)** : le CSS de la landing (`app/landing.css`, scopé sous `.lp`) et le CSS du reste de l'app (`app/globals.css` + Tailwind) sont **volontairement séparés et ne doivent pas être partagés**. Ne pas mutualiser les styles entre la landing et le reste de l'app pour l'instant — une unification est prévue plus tard.

---

## Design system

Le style visuel de référence vit désormais dans le code : `seela-app/app/landing.css` (landing) et `seela-app/app/globals.css` (reste de l'app).

Tokens principaux :
- Background général : `#FAFAF9` (warm off-white)
- Couleur principale : `#1A1A18` (near black)
- Couleur muted/secondaire : `#9A9A93` (warm gray)
- Font : Inter (system-ui en fallback)
- Logo : "seela" en lowercase, font-weight 600
- Style général : minimaliste, professionnel, épuré — zéro fioriture

Les pages internes existantes (`seela-app/app/app/`) sont la référence visuelle pour toute nouvelle page authentifiée.

---

## Pages à construire

### 1. `/` — Landing page
Intégrée à l'app Next.js (`app/page.tsx` + `components/landing/`), CSS dédié scopé `.lp` (`app/landing.css`).
CTA principal "Démarrer un financement" → redirige vers `/auth`.

---

### 2. `/auth` — Authentification
Deux états sur la même page :
- **Inscription** : email, mot de passe, nom de l'entreprise, SIREN
- **Connexion** : email + mot de passe

Provider : Supabase Auth.

---

### 3. `/app/dashboard` — Tableau de bord

Affiche la liste des demandes de financement du client connecté avec :
- Référence, actif financé, montant mensuel, statut, date de la prochaine échéance
- CTA "Nouveau financement" (→ `/app/nouveau`)
- Encours total et résumé financier en haut de page (comme dans le prototype)

Statuts possibles :
- `draft` — En cours de saisie
- `submitted` — Transmis à Seela
- `offers_available` — Offres disponibles
- `active` — Contrat actif

---

### 4. `/app/nouveau` — Flow de financement (multi-étapes avec barre de progression)

**Étape 1 — Upload du document**
- Zone drag & drop + bouton pour uploader devis ou facture (PDF ou image JPG/PNG)
- Stocker le fichier dans Supabase Storage
- Indiquer clairement : "Devis" ou "Facture" (le client sélectionne avant d'uploader)

**Étape 2 — Analyse IA et sélection des lignes**
- Envoyer le document à Claude API (vision)
- Prompt à utiliser :
  ```
  Analyse ce document commercial (devis ou facture) et extrait toutes les lignes de produits ou d'équipements.
  Pour chaque ligne, retourne : description (string), quantité (number), prix unitaire HT (number), prix total HT (number).
  Réponds uniquement en JSON avec le format : { "items": [ { "description": "", "quantity": 0, "unit_price": 0, "total_price": 0 } ] }
  Si une valeur est absente, utilise null.
  ```
- Afficher le résultat en tableau avec cases à cocher — le client sélectionne les lignes à financer
- Afficher le total des lignes sélectionnées en temps réel

**Étape 3 — Configuration du financement**
- Durée souhaitée : 24 / 36 / 48 / 60 mois (boutons radio stylés)
- Afficher le loyer mensuel estimé en temps réel (voir coefficients ci-dessous)
- Remarques libres (textarea, optionnel)

Coefficients pour l'estimation :
- 24 mois → × 0.0480
- 36 mois → × 0.0340
- 48 mois → × 0.0270
- 60 mois → × 0.0230

**Étape 4 — KYC léger** (uniquement à la première demande, sinon skipé)
- Chiffre d'affaires annuel : `< 500k€` / `500k – 2M€` / `2M – 10M€` / `> 10M€`
- Ancienneté de l'entreprise : `< 2 ans` / `2 – 5 ans` / `> 5 ans`
- Effectif : `1 – 10` / `11 – 50` / `51 – 250` / `> 250`

**Étape 5 — Offres indicatives**
- Afficher 3 cartes d'offres, calculées avec les coefficients × montant sélectionné × facteur leaser légèrement différent (+/- 3%)
- Leasers à afficher : BNP Lease, Société Générale Équipement, Crédit Agricole Leasing
- Chaque carte : nom du leaser, mensualité, durée, CTA "Choisir cette offre"
- Bandeau encadré bien visible : *"Offres indicatives — confirmées par le leaser sous 48h ouvrées. Votre dossier sera étudié par un conseiller Seela."*

**Étape 6 — Confirmation**
- Récapitulatif : document uploadé, lignes sélectionnées, offre choisie, montant mensuel, durée
- Message : "Votre dossier est transmis. Un conseiller Seela revient vers vous sous 48h ouvrées."
- Mettre la demande en statut `submitted` en base
- Envoyer un email de confirmation au client (via Supabase Edge Function ou Resend)

---

### 5. `/app/contrats/[id]` — Détail d'une demande

- Document uploadé (lien de téléchargement)
- Tableau des lignes sélectionnées
- Configuration retenue (durée, montant total, mensualité)
- Offre choisie et leaser
- Statut actuel + timeline des étapes (soumis → en étude → confirmé → actif)

---

## Modèle de données Supabase

```sql
-- Extension du profil utilisateur (Supabase Auth gère l'auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  company_name TEXT,
  siren TEXT,
  revenue_bracket TEXT,
  age_bracket TEXT,
  headcount_bracket TEXT,
  kyc_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demandes de financement
CREATE TABLE financing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft',
  document_url TEXT,
  document_type TEXT, -- 'devis' | 'facture'
  duration_months INTEGER,
  notes TEXT,
  total_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lignes de produits extraites par IA
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES financing_requests(id) ON DELETE CASCADE,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_price NUMERIC,
  selected BOOLEAN DEFAULT TRUE
);

-- Offres indicatives générées
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES financing_requests(id) ON DELETE CASCADE,
  leaser_name TEXT,
  monthly_payment NUMERIC,
  duration_months INTEGER,
  status TEXT DEFAULT 'indicative', -- 'indicative' | 'confirmed' | 'selected'
  selected BOOLEAN DEFAULT FALSE
);
```

---

## Règles de développement

- Toutes les routes sous `/app` (`/app/dashboard`, `/app/nouveau`, `/app/contrats/[id]`, …) sont protégées — redirection vers `/auth` si non connecté
- États de chargement (`loading`) sur toutes les actions async (upload, analyse IA, soumission)
- Gestion d'erreur explicite : upload échoué, analyse IA sans résultat, erreur réseau
- Responsive — le flow doit fonctionner sur mobile
- Pas de sidebar complexe en MVP — navigation simple (logo + "Se déconnecter")
- Utiliser les composants Tailwind sans librairie UI tierce

---

## Hors scope MVP (ne pas construire)

- Intégration API leasers (tout est manuel côté Seela)
- E-signature électronique
- Connexion Pennylane / open banking
- Scoring Seela live
- Multi-utilisateurs sur un même compte entreprise
- Gestion des renouvellements ou rachats anticipés
