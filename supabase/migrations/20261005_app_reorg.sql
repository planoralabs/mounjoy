-- Mounjoy — migração de outubro/2026 (reorganização do app)
--
-- Só ACRESCENTA colunas, tabelas e funções; não apaga nem altera dados
-- existentes. Pode rodar mais de uma vez sem problema (if not exists /
-- create or replace). Rode no SQL editor do projeto Supabase ANTES de ativar
-- o login para usuários reais. schema.sql já inclui tudo isto para projetos
-- novos.

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
