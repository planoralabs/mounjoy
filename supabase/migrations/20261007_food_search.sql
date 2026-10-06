-- Mounjoy — migração de 07/out/2026 (registro manual de refeições)
--
-- Só ACRESCENTA (colunas, índices, funções); não apaga dados. Pode rodar
-- mais de uma vez. Depois dela, importe supabase/seed/food_items.csv
-- (ver scripts/import-food-items.mjs). schema.sql já inclui tudo isto.

-- ── Extensões de busca ──────────────────────────────────────────────────
-- unaccent: "feijao" encontra "Feijão"; pg_trgm: busca por pedaços do nome
-- e tolerância a erros de digitação, com índice.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() não é immutable (depende do dicionário), então não pode ir numa
-- coluna gerada; este invólucro fixa o dicionário e pode.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions
as $$
    select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

-- ── food_items: origem TACO, idioma e nome normalizado ──────────────────
alter table public.food_items drop constraint if exists food_items_source_check;
alter table public.food_items
    add constraint food_items_source_check check (source in ('taco', 'usda', 'openfoodfacts', 'manual'));

-- lang: idioma do nome ('pt' TACO, 'en' USDA) — a busca mostra primeiro
-- os alimentos no idioma do usuário.
alter table public.food_items
    add column if not exists lang text not null default 'en',
    add column if not exists name_norm text generated always as (public.f_unaccent(lower(name))) stored;

create unique index if not exists food_items_source_uidx on public.food_items (source, source_id);
create index if not exists food_items_name_norm_trgm_idx on public.food_items using gin (name_norm extensions.gin_trgm_ops);

-- ── Busca ───────────────────────────────────────────────────────────────
-- Todas as palavras digitadas precisam aparecer no nome (em qualquer ordem,
-- sem acento: "frango grel" → "Frango, peito, sem pele, grelhado"). Se nada
-- bater assim, aceita nomes parecidos (erro de digitação: "fejao").
create or replace function public.search_food_items(q text, pref_lang text default 'pt', max_results integer default 25)
returns table (
    id uuid, name text, category text, source text, lang text,
    calories_per_100g numeric, protein_per_100g numeric, carbs_per_100g numeric,
    fat_per_100g numeric, fiber_per_100g numeric, all_words boolean, score real
)
language sql
stable
set search_path = public, extensions
as $$
    with query as (
        select trim(regexp_replace(public.f_unaccent(lower(coalesce(q, ''))), '[^a-z0-9 ]+', ' ', 'g')) as nq
    ),
    words as (
        select w from query, regexp_split_to_table(query.nq, '\s+') as w where length(w) > 0
    ),
    hits as (
        select f.*,
            not exists (select 1 from words where position(words.w in f.name_norm) = 0) as all_words,
            extensions.word_similarity(query.nq, f.name_norm) as score
        from public.food_items f, query
        where length(query.nq) >= 2
          and (
              f.name_norm like '%' || (select w from words limit 1) || '%'
              or extensions.word_similarity(query.nq, f.name_norm) > 0.45
          )
    )
    select h.id, h.name, h.category, h.source, h.lang,
        h.calories_per_100g, h.protein_per_100g, h.carbs_per_100g, h.fat_per_100g, h.fiber_per_100g,
        h.all_words, h.score
    from hits h
    where h.all_words or h.score > 0.45
    order by h.all_words desc,
        (h.lang = pref_lang) desc,
        (h.name_norm like (select w from words limit 1) || '%') desc,
        h.score desc,
        length(h.name)
    limit least(greatest(max_results, 1), 50)
$$;

grant execute on function public.search_food_items(text, text, integer) to anon, authenticated;

-- ── profiles: alimentos criados pelo usuário ────────────────────────────
-- [{ id, name, calories, protein, carbs, fat, fiber }] por 100 g.
alter table public.profiles
    add column if not exists custom_foods jsonb not null default '[]'::jsonb;
