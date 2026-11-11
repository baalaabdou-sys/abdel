-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 8 (à coller APRÈS schema-v7.sql)
--  Chaque membre peut supprimer (masquer) une notification pour lui-même,
--  en la faisant glisser dans la cloche. Les annonces restent visibles pour les autres.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.notifications_masquees (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  membre_id       uuid not null references public.profiles (id) on delete cascade,
  masquee_at      timestamptz not null default now(),
  primary key (notification_id, membre_id)
);

alter table public.notifications_masquees enable row level security;

drop policy if exists masquees_lecture on public.notifications_masquees;
create policy masquees_lecture on public.notifications_masquees for select to authenticated using (membre_id = auth.uid());
drop policy if exists masquees_ajout on public.notifications_masquees;
create policy masquees_ajout on public.notifications_masquees for insert to authenticated with check (membre_id = auth.uid());
drop policy if exists masquees_retrait on public.notifications_masquees;
create policy masquees_retrait on public.notifications_masquees for delete to authenticated using (membre_id = auth.uid());
