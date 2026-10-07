-- Mounjoy — schema do Postgres/Supabase
--
-- Reconstruído a partir das queries em src/services/userService.js, já que o
-- schema não estava versionado em lugar nenhum do repositório. Rode este
-- arquivo inteiro no SQL editor de QUALQUER projeto Supabase novo (produção
-- ou teste) para recriar as 5 tabelas usadas pelo app + RLS básica.
--
-- RLS: cada usuário só enxerga/edita as próprias linhas (auth.uid() = id ou
-- user_id). Isso é o que hoje faz o papel das antigas firestore.rules.

-- ── profiles ────────────────────────────────────────────────────────────
-- Uma linha por usuário, id = auth.users.id (Supabase Auth).
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    name text,
    email text,
    photo_url text,
    start_date timestamptz not null default now(),
    medication_id text not null default 'ozempic',
    current_dose text not null default '0.25 mg',
    is_maintenance boolean not null default false,
    protein_goal numeric not null default 100,
    water_goal numeric not null default 2.5,
    fiber_goal numeric not null default 25,
    unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
    for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
    for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
    for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
    for delete using (auth.uid() = id);

-- ── measurements ────────────────────────────────────────────────────────
create table if not exists public.measurements (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    date timestamptz not null,
    weight numeric not null default 0,
    waist numeric not null default 0,
    hip numeric not null default 0
);

create index if not exists measurements_user_id_idx on public.measurements (user_id);

alter table public.measurements enable row level security;

create policy "measurements_all_own" on public.measurements
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── dose_history ────────────────────────────────────────────────────────
create table if not exists public.dose_history (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    date timestamptz not null,
    dose text not null default '0.25 mg',
    medication text not null default 'ozempic',
    site text not null default 'Não registrado'
);

create index if not exists dose_history_user_id_idx on public.dose_history (user_id);

alter table public.dose_history enable row level security;

create policy "dose_history_all_own" on public.dose_history
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── symptoms_logs ───────────────────────────────────────────────────────
create table if not exists public.symptoms_logs (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    date timestamptz not null,
    nausea integer not null default 0,
    headache integer not null default 0,
    fatigue integer not null default 0,
    notes text default ''
);

create index if not exists symptoms_logs_user_id_idx on public.symptoms_logs (user_id);

alter table public.symptoms_logs enable row level security;

create policy "symptoms_logs_all_own" on public.symptoms_logs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── daily_intake ────────────────────────────────────────────────────────
-- Uma linha por usuário/dia (upsert com onConflict: 'user_id,date').
create table if not exists public.daily_intake (
    user_id uuid not null references public.profiles (id) on delete cascade,
    date date not null,
    water numeric not null default 0,
    protein numeric not null default 0,
    fiber numeric not null default 0,
    primary key (user_id, date)
);

alter table public.daily_intake enable row level security;

create policy "daily_intake_all_own" on public.daily_intake
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── food_items ──────────────────────────────────────────────────────────
-- Base de nutrição própria, semeada a partir de fontes abertas globais
-- (Open Food Facts + USDA FoodData Central) — não depende de API externa
-- em runtime. Ver docs/historico/mobile_documentation.md seção 7.5.
create table if not exists public.food_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    name_search text generated always as (lower(name)) stored,
    category text,
    source text not null default 'manual' check (source in ('openfoodfacts', 'usda', 'manual')),
    source_id text,
    calories_per_100g numeric not null,
    protein_per_100g numeric not null,
    carbs_per_100g numeric not null,
    fat_per_100g numeric not null,
    fiber_per_100g numeric,
    created_at timestamptz not null default now()
);

create index if not exists food_items_name_search_idx on public.food_items (name_search);

alter table public.food_items enable row level security;

-- food_items é um catálogo global compartilhado, não por usuário: todos
-- podem ler, ninguém escreve pelo client (só a Edge Function/admin via
-- service role, que ignora RLS).
create policy "food_items_select_all" on public.food_items
    for select using (true);

-- ── meal_logs ───────────────────────────────────────────────────────────
-- Um registro por prato escaneado/confirmado pelo usuário. `items` guarda
-- uma cópia dos macros calculados no momento do registro (não só a
-- referência a food_items), para que uma correção futura na base não
-- altere retroativamente o histórico do usuário.
create table if not exists public.meal_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    logged_at timestamptz not null default now(),
    items jsonb not null default '[]'::jsonb,
    total_calories numeric not null default 0,
    total_protein numeric not null default 0,
    total_carbs numeric not null default 0,
    total_fat numeric not null default 0
);

create index if not exists meal_logs_user_id_idx on public.meal_logs (user_id);

alter table public.meal_logs enable row level security;

create policy "meal_logs_all_own" on public.meal_logs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── meal_scan_usage ─────────────────────────────────────────────────────
-- Server-side rate-limit counter for the analyze-meal-photo Edge Function.
-- One row per user per day. Never written to directly by the client — only
-- through check_and_increment_meal_scan_usage() below, which is the single
-- gate the Edge Function calls before spending Gemini quota. A stateless
-- Edge Function instance can't remember previous calls on its own, so the
-- counter has to live here. See docs/historico/mobile_documentation.md section 7.9.
create table if not exists public.meal_scan_usage (
    user_id uuid not null references public.profiles (id) on delete cascade,
    date date not null,
    count integer not null default 0,
    last_request_at timestamptz not null default now(),
    primary key (user_id, date)
);

alter table public.meal_scan_usage enable row level security;

-- Client can read its own usage (e.g. to show "12/20 scans today" in the
-- UI) but never write directly — all writes go through the SECURITY
-- DEFINER function, which enforces the limit atomically.
create policy "meal_scan_usage_select_own" on public.meal_scan_usage
    for select using (auth.uid() = user_id);

create or replace function public.check_and_increment_meal_scan_usage(
    daily_limit integer default 20,
    min_interval_seconds integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    today date := current_date;
    rec public.meal_scan_usage%rowtype;
begin
    if uid is null then
        return jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
    end if;

    select * into rec from public.meal_scan_usage
        where user_id = uid and date = today
        for update;

    if not found then
        insert into public.meal_scan_usage (user_id, date, count, last_request_at)
        values (uid, today, 1, now());
        return jsonb_build_object('allowed', true, 'count', 1, 'limit', daily_limit);
    end if;

    if rec.last_request_at > now() - make_interval(secs => min_interval_seconds) then
        return jsonb_build_object('allowed', false, 'reason', 'too_frequent');
    end if;

    if rec.count >= daily_limit then
        return jsonb_build_object('allowed', false, 'reason', 'daily_limit_reached', 'count', rec.count, 'limit', daily_limit);
    end if;

    update public.meal_scan_usage
        set count = count + 1, last_request_at = now()
        where user_id = uid and date = today;

    return jsonb_build_object('allowed', true, 'count', rec.count + 1, 'limit', daily_limit);
end;
$$;

grant execute on function public.check_and_increment_meal_scan_usage(integer, integer) to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────
-- userService.subscribeToUser() escuta mudanças via supabase.channel(...).on('postgres_changes', ...)
-- nas 5 tabelas acima. Habilite Realtime para elas em Database → Replication
-- no dashboard do projeto (não dá para fazer via SQL puro em todo plano).

-- ════════════════════════════════════════════════════════════════════
-- Outubro/2026: o mesmo conteúdo de supabase/migrations/20261005_app_reorg.sql
-- (colunas novas, formato dos sintomas e limites da análise de refeições).
-- ════════════════════════════════════════════════════════════════════
-- ── profiles: dados do cadastro e metas novas ───────────────────────────
alter table public.profiles
    add column if not exists calorie_goal numeric not null default 1800,
    add column if not exists fat_goal numeric not null default 60,
    add column if not exists carbs_goal numeric not null default 150,
    add column if not exists height_m numeric,
    add column if not exists start_weight numeric,
    add column if not exists goal_weight numeric,
    add column if not exists injection_day smallint check (injection_day between 0 and 6),
    add column if not exists reminders_enabled boolean not null default true,
    add column if not exists reminder_time text not null default '09:00';

-- ── daily_intake: calorias, gorduras e carboidratos do dia ──────────────
alter table public.daily_intake
    add column if not exists calories numeric not null default 0,
    add column if not exists fat numeric not null default 0,
    add column if not exists carbs numeric not null default 0;

-- ── symptoms_logs: formato atual do "Como estou" ────────────────────────
-- symptoms: ids estáveis ('nausea', 'vomito', 'fadiga', 'azia', 'constipação');
-- food_noise: 0–10 ou null quando não informado; notes guarda a anotação.
-- As colunas antigas (nausea, headache, fatigue) ficam para registros antigos.
alter table public.symptoms_logs
    add column if not exists symptoms text[] not null default '{}',
    add column if not exists food_noise smallint check (food_noise between 0 and 10),
    add column if not exists trigger text not null default '',
    add column if not exists is_memory_only boolean not null default false;

-- ── meal_logs: fibra total da refeição ──────────────────────────────────
alter table public.meal_logs
    add column if not exists total_fiber numeric not null default 0;

-- ── Limites da análise de refeições para quem não está logado ──────────
-- Contador por IP (guardado como hash, nunca o IP em si) e um teto global
-- por dia para todo o app, que protege a conta do Gemini mesmo se muitos
-- aparelhos diferentes chamarem a função. Só a Edge Function (service role)
-- escreve aqui; o app nunca acessa estas tabelas.
create table if not exists public.meal_scan_anon_usage (
    ip_hash text not null,
    date date not null,
    count integer not null default 0,
    last_request_at timestamptz not null default now(),
    primary key (ip_hash, date)
);
alter table public.meal_scan_anon_usage enable row level security;

create table if not exists public.meal_scan_global_usage (
    date date primary key,
    count integer not null default 0
);
alter table public.meal_scan_global_usage enable row level security;

create or replace function public.check_and_increment_anon_meal_scan(
    p_ip_hash text,
    daily_limit integer default 5,
    min_interval_seconds integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    today date := current_date;
    rec public.meal_scan_anon_usage%rowtype;
begin
    select * into rec from public.meal_scan_anon_usage
        where ip_hash = p_ip_hash and date = today
        for update;

    if not found then
        insert into public.meal_scan_anon_usage (ip_hash, date, count, last_request_at)
        values (p_ip_hash, today, 1, now());
        return jsonb_build_object('allowed', true, 'count', 1, 'limit', daily_limit);
    end if;

    if rec.last_request_at > now() - make_interval(secs => min_interval_seconds) then
        return jsonb_build_object('allowed', false, 'reason', 'too_frequent');
    end if;

    if rec.count >= daily_limit then
        return jsonb_build_object('allowed', false, 'reason', 'daily_limit_reached', 'count', rec.count, 'limit', daily_limit);
    end if;

    update public.meal_scan_anon_usage
        set count = count + 1, last_request_at = now()
        where ip_hash = p_ip_hash and date = today;

    return jsonb_build_object('allowed', true, 'count', rec.count + 1, 'limit', daily_limit);
end;
$$;

create or replace function public.check_and_increment_global_meal_scan(daily_limit integer default 300)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    today date := current_date;
    current_count integer;
begin
    insert into public.meal_scan_global_usage (date, count) values (today, 0)
        on conflict (date) do nothing;

    select count into current_count from public.meal_scan_global_usage
        where date = today
        for update;

    if current_count >= daily_limit then
        return jsonb_build_object('allowed', false, 'reason', 'global_limit_reached', 'count', current_count, 'limit', daily_limit);
    end if;

    update public.meal_scan_global_usage set count = count + 1 where date = today;
    return jsonb_build_object('allowed', true, 'count', current_count + 1, 'limit', daily_limit);
end;
$$;

-- Só a Edge Function (service role) chama estas duas; o app não pode.
revoke execute on function public.check_and_increment_anon_meal_scan(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.check_and_increment_global_meal_scan(integer) from public, anon, authenticated;
grant execute on function public.check_and_increment_anon_meal_scan(text, integer, integer) to service_role;
grant execute on function public.check_and_increment_global_meal_scan(integer) to service_role;

-- ── profiles: preferências de lembrete e suplementos que o usuário usa ──
-- reminder_settings: { dose: {enabled, time}, water: {enabled},
--   protein: {enabled, time}, weight: {enabled, time, frequency, day} }
-- supplements: [{ id, name?, custom?, frequency, nutrients? }]
alter table public.profiles
    add column if not exists reminder_settings jsonb not null default '{}'::jsonb,
    add column if not exists supplements jsonb not null default '[]'::jsonb;

-- ── supplement_logs: cada vez que o usuário marca um suplemento ─────────
-- `name` guarda o nome no momento do registro, para que um suplemento
-- personalizado removido depois continue aparecendo no histórico.
create table if not exists public.supplement_logs (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    date timestamptz not null,
    supplement_id text not null,
    name text not null default ''
);

create index if not exists supplement_logs_user_id_idx on public.supplement_logs (user_id);

alter table public.supplement_logs enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename = 'supplement_logs' and policyname = 'supplement_logs_all_own') then
        create policy "supplement_logs_all_own" on public.supplement_logs
            for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
end $$;

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
