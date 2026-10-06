-- Mounjoy — migração de 06/out/2026 (lembretes e suplementos)
--
-- Só ACRESCENTA colunas e uma tabela; não apaga nem altera dados existentes.
-- Pode rodar mais de uma vez sem problema (if not exists). Rode no SQL editor
-- do projeto Supabase. Até rodar, o app continua funcionando: só não salva na
-- nuvem os suplementos e as preferências de lembrete (ver withNewerSchema em
-- src/services/userService.js). schema.sql já inclui tudo isto para projetos novos.

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
