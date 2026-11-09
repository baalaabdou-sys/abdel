-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 3 (à coller APRÈS schema-v2.sql)
--  Contenus du site modifiables depuis le tableau de bord :
--  textes du club, coordonnées, FAQ et membres du bureau.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- Réglages et textes du site, rangés par clé : 'club', 'contact', 'faq'.
create table if not exists public.parametres (
  cle        text primary key check (cle in ('club', 'contact', 'faq')),
  valeur     jsonb not null,
  updated_at timestamptz not null default now()
);

-- Membres du bureau affichés sur la page « Le club ».
create table if not exists public.bureau_membres (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null check (length(nom) between 1 and 120),
  role       text not null check (length(role) between 1 and 120),
  photo      text,                              -- dans le stockage « medias »
  ordre      int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.parametres     enable row level security;
alter table public.bureau_membres enable row level security;

drop policy if exists parametres_lecture on public.parametres;
create policy parametres_lecture on public.parametres for select to anon, authenticated using (true);
drop policy if exists parametres_gestion on public.parametres;
create policy parametres_gestion on public.parametres for all to authenticated
  using (public.est_bureau()) with check (public.est_bureau());

drop policy if exists bureau_membres_lecture on public.bureau_membres;
create policy bureau_membres_lecture on public.bureau_membres for select to anon, authenticated using (true);
drop policy if exists bureau_membres_gestion on public.bureau_membres;
create policy bureau_membres_gestion on public.bureau_membres for all to authenticated
  using (public.est_bureau()) with check (public.est_bureau());
