
WITH seed AS (
  SELECT 0 AS ord, l.slug AS k,
    format('INSERT INTO public.leasers SELECT * FROM json_populate_record(NULL::public.leasers, %L);', row_to_json(l)) AS sql
  FROM public.leasers l WHERE l.slug IS DISTINCT FROM 'leaser-test'
  UNION ALL
  SELECT 1, x.tbl || x.id, format('INSERT INTO public.%I SELECT * FROM json_populate_record(NULL::public.%I, %L);', x.tbl, x.tbl, x.js)
  FROM (
    SELECT 'leaser_equipment_categories' AS tbl, c.id::text AS id, c.leaser_id, row_to_json(c) AS js FROM public.leaser_equipment_categories c
    UNION ALL SELECT 'leaser_financing_types', f.id::text, f.leaser_id, row_to_json(f) FROM public.leaser_financing_types f
    UNION ALL SELECT 'leaser_excluded_sectors', s.id::text, s.leaser_id, row_to_json(s) FROM public.leaser_excluded_sectors s
    UNION ALL SELECT 'leaser_rates', r.id::text, r.leaser_id, row_to_json(r) FROM public.leaser_rates r
    UNION ALL SELECT 'leaser_advantages', a.id::text, a.leaser_id, row_to_json(a) FROM public.leaser_advantages a
  ) x
  JOIN public.leasers l ON l.id = x.leaser_id
  WHERE l.slug IS DISTINCT FROM 'leaser-test'
)
SELECT string_agg(sql, E'\n' ORDER BY ord, k) AS seed FROM seed;
