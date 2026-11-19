"""Note et trie les sociétés enrichies, garde les N meilleures pour le choix de Lorenzo.
Usage : python noter.py enrichi.csv candidats.csv --metier "boulangerie,patisserie,pain" [--max 150]
Score sur 8 : signal (rachat ou nouvel établissement = 3, transfert ou autre = 2) + taille (CA, établissements, avis : 1 à 3)
+ contactabilité (gérant connu, téléphone fiable). Le téléphone n'est gardé que si la fiche Google Maps correspond à la société."""
import argparse, csv, re, unicodedata

p = argparse.ArgumentParser()
p.add_argument('src'); p.add_argument('out')
p.add_argument('--metier', required=True, help='mots du métier attendus dans le nom Google Maps')
p.add_argument('--max', type=int, default=150)
a = p.parse_args()

STOP = {'sarl', 'sas', 'sasu', 'eurl', 'la', 'le', 'les', 'de', 'du', 'des', 'et', 'sa', 'snc', 'the', 'au', 'aux', 'maison'}
METIER = {m.strip().lower() for m in a.metier.split(',') if m.strip()}
LIB = {'rachat': 'Rachat d’un fonds', 'etablissement_secondaire': 'Ouverture d’un nouvel établissement',
       'transfert': 'Transfert / déménagement', 'autre': 'Nouvel établissement principal'}

def ascii_(s): return unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
def toks(s): return {t for t in re.findall(r'[a-z0-9]{3,}', ascii_(s)) if t not in STOP | METIER}
def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None

out = []
for r in csv.DictReader(open(a.src)):
    if r.get('statut_maps') == 'CLOSED_PERMANENTLY': continue
    fiable = bool((toks(r.get('enseigne')) | toks(r.get('societe'))) & toks(r.get('maps_nom'))) or bool(set(re.findall(r'[a-z]+', ascii_(r.get('maps_nom')))) & METIER)
    r['maps_fiable'] = 'oui' if fiable else 'à vérifier'
    r['telephone_boutique'] = (r.get('telephone') or '') if fiable else ''
    ca, etabs, avis = num(r.get('ca')), num(r.get('etablissements_ouverts')) or 1, num(r.get('avis')) or 0
    r['signal'] = 3 if r['type_ouverture'] in ('rachat', 'etablissement_secondaire') else 2
    r['adequation'] = 3 if (ca and ca >= 300000) or etabs >= 2 or avis >= 300 else 2 if (ca and ca >= 100000) or avis >= 80 else 1
    r['score'] = r['signal'] + r['adequation'] + (1 if r.get('gerant_nom') else 0) + (1 if r['telephone_boutique'] else 0)
    r['signal_txt'] = f"{LIB.get(r['type_ouverture'], 'Ouverture')} à {(r.get('ville') or '').title()} le {r['ouverture']} (SIRENE, SIRET {r['siret']})"
    out.append(r)

out.sort(key=lambda r: (-r['score'], -(num(r.get('avis')) or 0)))
cols = ['seg', 'score', 'signal', 'adequation', 'societe', 'enseigne', 'ville', 'cp', 'ouverture', 'type_ouverture', 'signal_txt',
        'gerant_prenom', 'gerant_nom', 'gerant_qualite', 'telephone_boutique', 'site', 'note', 'avis', 'ca', 'annee_fin',
        'etablissements_ouverts', 'creation_societe', 'maps_nom', 'maps_fiable', 'maps_url', 'siren', 'siret']
with open(a.out, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(out[:a.max])
print(f"{len(out)} sociétés, {min(len(out), a.max)} gardées → {a.out}")
