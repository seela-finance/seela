"""Enrichit une liste d'ouvertures : gérant et chiffres (annuaire des entreprises, gratuit), téléphone, site et avis (Google Places).
Usage : python enrichir.py ouvertures.csv enrichi.csv
Clé Google : seela-app/.env.google.local (GOOGLE_PLACES_API_KEY). ~1 appel Google par société."""
import csv, json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
KEY = next(l.split('=', 1)[1].strip() for l in open(os.path.join(ROOT, 'seela-app/.env.google.local')) if l.startswith('GOOGLE_PLACES_API_KEY='))
rows = list(csv.DictReader(open(sys.argv[1])))

def get(url, data=None, headers={}):
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=20))
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(2 + 2 * i); continue
            return None
        except Exception:
            time.sleep(1)

def annuaire(r):
    d = get('https://recherche-entreprises.api.gouv.fr/search?q=' + r['siren'])
    time.sleep(0.3)
    res = next((x for x in (d or {}).get('results', []) if x['siren'] == r['siren']), None)
    if not res: return
    pp = [x for x in res.get('dirigeants', []) if x.get('type_dirigeant') == 'personne physique']
    if pp:
        r['gerant_prenom'] = (pp[0].get('prenoms') or '').split(' ')[0].title()
        r['gerant_nom'] = (pp[0].get('nom') or '').title()
        r['gerant_qualite'] = pp[0].get('qualite') or ''
    r['etablissements_ouverts'] = res.get('nombre_etablissements_ouverts')
    fin = res.get('finances') or {}
    if fin:
        y = max(fin); r['ca'] = fin[y].get('ca'); r['annee_fin'] = y

def places(r):
    q = f"{r.get('enseigne') or r['societe']} {r.get('adresse') or ''} {r.get('cp') or ''} {r.get('ville') or ''}"
    d = get('https://places.googleapis.com/v1/places:searchText', json.dumps({'textQuery': q, 'languageCode': 'fr', 'regionCode': 'FR'}).encode(), {
        'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri'})
    pl = ((d or {}).get('places') or [None])[0]
    if not pl: return
    r.update(maps_nom=pl.get('displayName', {}).get('text'), telephone=pl.get('nationalPhoneNumber'), site=pl.get('websiteUri'),
             note=pl.get('rating'), avis=pl.get('userRatingCount'), statut_maps=pl.get('businessStatus'), maps_url=pl.get('googleMapsUri'))

for r in rows: annuaire(r)
with ThreadPoolExecutor(5) as ex: list(ex.map(places, rows))
cols = list(dict.fromkeys(k for r in rows for k in r))
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)
print('lignes', len(rows), '→', sys.argv[2])
