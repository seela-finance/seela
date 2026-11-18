# Attribution des leads

## Comment ça marche

1. **À la première visite**, `proxy.ts` retient d'où vient le visiteur dans un cookie propre au site, `ev_src` (90 jours, illisible par le navigateur) :
   - les paramètres `utm_*` du lien ;
   - le domaine du site d'où il arrive ;
   - la page d'arrivée.

   La première source est gardée. Une première visite en accès direct cède la place à la première vraie source qui suit.
2. **À l'inscription, à l'onboarding ou au formulaire « Parler à un expert »**, cette source est copiée sur la société du CRM (`companies.attribution`, `companies.attribution_channel`). Une société qui a déjà une source la garde.
3. **Dans le back-office**, la source apparaît :
   - sur la fiche société du CRM : « Acquisition » ;
   - sur la fiche dossier : « Source d'acquisition ».

Canaux affichés : « Lemlist · chr-novembre » (lien tagué), « Google (naturel) », « LinkedIn », « IA (chatgpt.com) », « Site référent (…) », « Accès direct ».

Code : `lib/attribution.ts` (logique pure), `lib/attribution-store.ts` (cookie et écriture), migration `20261118140000_lead_attribution.sql`.

## Taguer ses liens

Les pages du site ne changent pas. Seuls les liens que l'on diffuse reçoivent un suffixe. Les visites venant de Google, LinkedIn ou d'un site partenaire sont reconnues sans suffixe. Les emails, eux, n'indiquent pas d'où ils viennent : sans suffixe, ils apparaissent en « Accès direct ».

Règles :
- **Minuscules, sans espace ni accent**, avec des tirets.
- **`utm_source`** = l'outil ou le site.
- **`utm_medium`** = le type de canal.
- **`utm_campaign`** = la campagne.

| Canal | Suffixe à ajouter au lien |
|---|---|
| Séquence Lemlist | `?utm_source=lemlist&utm_medium=email&utm_campaign=chr-novembre` |
| Post LinkedIn (organique) | `?utm_source=linkedin&utm_medium=social&utm_campaign=post-distributeurs` |
| Message LinkedIn (DM) | `?utm_source=linkedin&utm_medium=dm&utm_campaign=…` |
| Publicité LinkedIn | `?utm_source=linkedin&utm_medium=paid&utm_campaign=…` |
| Signature d'email | `?utm_source=signature&utm_medium=email&utm_campaign=louis` |
| Deck ou one-pager distributeurs | `?utm_source=deck&utm_medium=document&utm_campaign=distributeurs-it` |
| QR code (salon, flyer) | `?utm_source=qr&utm_medium=print&utm_campaign=salon-…` |
| Partenaire qui nous recommande | `?utm_source=nom-du-partenaire&utm_medium=partenaire` |

Exemple : `https://www.everlease.fr/distributeurs?utm_source=lemlist&utm_medium=email&utm_campaign=chr-novembre`.

## Confidentialité

Le cookie ne contient que la source de la visite : pas d'identifiant et aucun partage avec un tiers. Il sert à savoir quel canal a apporté chaque client. À mentionner dans la politique de confidentialité. Un avis juridique dira s'il relève de l'exemption de consentement de la CNIL ou s'il doit passer par un bandeau.
