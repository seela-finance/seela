# Base de données Supabase

- `migrations/` : le schéma, versionné. `20261102000000_baseline.sql` recrée la base de zéro
  (tables, contraintes, fonctions, trigger `auth.users`, RLS, policies, bucket `documents`).
  Toute évolution = **nouveau** fichier `migrations/<AAAAMMJJHHMMSS>_<nom>.sql`, appliqué
  d'abord sur staging, puis en prod, par Louis (SQL editor). Ne jamais modifier une migration existante.
- `seed.sql` : données de référence leasers (staging / dev uniquement).
- `legacy/` : anciens scripts ad hoc, déjà appliqués en prod et inclus dans la baseline.

## Créer une base (staging, dev)

Dans le SQL editor du nouveau projet, dans l'ordre :
1. `migrations/*.sql`, par ordre de nom ;
2. `seed.sql`.

## Ré-extraire le schéma de la prod

`export-baseline.sql` et `export-seed.sql` sont en lecture seule (la seule écriture est une
fonction `pg_temp`, effacée en fin de session). Les coller **tels quels** dans le SQL editor :
l'éditeur échoue (« relation "public" does not exist ») sur la requête du schéma si elle n'est pas
exécutée via la fonction temporaire, et sur les requêtes précédées de commentaires.
Résultat : une cellule, à exporter en CSV (Results → Export → Download CSV).
