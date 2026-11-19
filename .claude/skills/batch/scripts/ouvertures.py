"""Ouvertures récentes (SIRENE open data) : nouveaux établissements d'un code NAF dans des sociétés anciennes.
Usage : python ouvertures.py --naf 93.13Z --depuis 2025-03-01 --segment salle_de_sport --out ouvertures.csv
        [--anciennete 3] [--exclure "BASIC-FIT,SUCCURSALE"]
Dépendance : duckdb (pip install duckdb). Durée : ~10 min (lecture distante du fichier SIRENE)."""
import argparse, datetime, json, urllib.request
import duckdb

p = argparse.ArgumentParser()
p.add_argument('--naf', required=True)
p.add_argument('--depuis', required=True)
p.add_argument('--segment', required=True)
p.add_argument('--out', required=True)
p.add_argument('--anciennete', type=int, default=3)
p.add_argument('--exclure', default='SUCCURSALE,BASIC-FIT,KEEP COOL')
a = p.parse_args()

meta = json.load(urllib.request.urlopen('https://www.data.gouv.fr/api/1/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/'))
url = {r['title'].split(' - ')[0]: r['url'] for r in meta['resources'] if r.get('format') == 'parquet'}
E, U, L = url['Sirene : Fichier StockEtablissement'], url['Sirene : Fichier StockUniteLegale'], url['Sirene : Fichier StockEtablissementLiensSuccession']
nafs = ','.join(f"'{n.strip()}'" for n in a.naf.split(','))
limite = (datetime.date.today() - datetime.timedelta(days=365 * a.anciennete)).isoformat()
excl = ' '.join(f"AND upper(coalesce(u.societe,'')) NOT LIKE '%{x.strip().upper()}%'" for x in a.exclure.split(',') if x.strip())

c = duckdb.connect()
c.execute("INSTALL httpfs; LOAD httpfs; SET threads=8;")
c.execute(f"""CREATE TABLE n AS SELECT siren, siret, dateCreationEtablissement AS ouverture, etablissementSiege AS siege,
  activitePrincipaleEtablissement AS naf, concat_ws(' ', numeroVoieEtablissement, typeVoieEtablissement, libelleVoieEtablissement) AS adresse,
  codePostalEtablissement AS cp, libelleCommuneEtablissement AS ville, coalesce(enseigne1Etablissement, denominationUsuelleEtablissement) AS enseigne
  FROM read_parquet('{E}') WHERE activitePrincipaleEtablissement IN ({nafs}) AND etatAdministratifEtablissement = 'A'
  AND dateCreationEtablissement >= DATE '{a.depuis}'""")
c.execute(f"""CREATE TABLE u AS SELECT siren, dateCreationUniteLegale AS creation_societe, denominationUniteLegale AS societe,
  categorieJuridiqueUniteLegale AS cj, categorieEntreprise FROM read_parquet('{U}') WHERE siren IN (SELECT siren FROM n)""")
c.execute(f"""CREATE TABLE l AS SELECT siretEtablissementPredecesseur AS pred, siretEtablissementSuccesseur AS succ
  FROM read_parquet('{L}') WHERE siretEtablissementSuccesseur IN (SELECT siret FROM n)""")
c.execute(f"""COPY (
  SELECT * EXCLUDE (rk) FROM (
    SELECT '{a.segment}' AS seg, n.*, u.societe, u.creation_societe, u.cj, u.categorieEntreprise,
      CASE WHEN l.pred IS NOT NULL AND substr(l.pred, 1, 9) = n.siren THEN 'transfert'
           WHEN l.pred IS NOT NULL THEN 'rachat'
           WHEN NOT n.siege THEN 'etablissement_secondaire' ELSE 'autre' END AS type_ouverture,
      count(*) OVER (PARTITION BY n.siren) AS nb_ouvertures,
      row_number() OVER (PARTITION BY n.siren ORDER BY n.ouverture DESC) AS rk
    FROM n JOIN u USING (siren) LEFT JOIN l ON l.succ = n.siret
    WHERE u.creation_societe <= DATE '{limite}' AND u.cj <> '1000' AND coalesce(u.societe, '') NOT IN ('', '[ND]')
      AND coalesce(u.categorieEntreprise, '') NOT IN ('GE', 'ETI') {excl}
  ) WHERE rk = 1
) TO '{a.out}' (HEADER, DELIMITER ',')""")
print('sociétés', c.execute(f"SELECT count(*) FROM read_csv_auto('{a.out}')").fetchone()[0], '→', a.out)
