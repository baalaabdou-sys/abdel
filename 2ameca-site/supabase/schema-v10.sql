-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 10 (à coller APRÈS schema-v9.sql)
--  Mode édition visuel : brouillons, publication et historique des pages.
--  Seuls les ADMINISTRATEURS peuvent modifier le site ; tout le monde lit la version publiée.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- Version publiée de chaque page (« / », « /le-club/ »…) ; « * » = éléments communs (menu, pied de page).
create table if not exists public.site_publie (
  page       text primary key check (length(page) between 1 and 200),
  contenu    jsonb not null default '{}',
  publie_at  timestamptz not null default now(),
  publie_par uuid references public.profiles (id) on delete set null
);

-- Brouillon en cours (un par page), visible et modifiable par les administrateurs seulement.
create table if not exists public.site_brouillons (
  page       text primary key check (length(page) between 1 and 200),
  contenu    jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null
);

-- Historique : chaque publication est conservée et peut être restaurée.
create table if not exists public.site_versions (
  id         bigserial primary key,
  page       text not null,
  contenu    jsonb not null,
  note       text not null default '',
  publie_par uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_versions_page_idx on public.site_versions (page, created_at desc);

alter table public.site_publie     enable row level security;
alter table public.site_brouillons enable row level security;
alter table public.site_versions   enable row level security;

-- Lecture publique de la version publiée ; aucune écriture directe (seulement par la fonction publier_page).
drop policy if exists site_publie_lecture on public.site_publie;
create policy site_publie_lecture on public.site_publie for select to anon, authenticated using (true);

drop policy if exists site_brouillons_admin on public.site_brouillons;
create policy site_brouillons_admin on public.site_brouillons for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

drop policy if exists site_versions_lecture on public.site_versions;
create policy site_versions_lecture on public.site_versions for select to authenticated using (public.est_admin());

-- Publier une page : vérifie le rôle côté serveur, enregistre la version, vide le brouillon.
create or replace function public.publier_page(p_page text, p_contenu jsonb, p_note text default '')
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if not public.est_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if p_page is null or p_page !~ '^(\*|/[a-z0-9/_-]*)$' then raise exception 'Page invalide'; end if;
  if p_contenu is null or jsonb_typeof(p_contenu) <> 'object' then raise exception 'Contenu invalide'; end if;
  if octet_length(p_contenu::text) > 500000 then raise exception 'Contenu trop volumineux'; end if;
  insert into public.site_publie (page, contenu, publie_at, publie_par) values (p_page, p_contenu, t, auth.uid())
    on conflict (page) do update set contenu = excluded.contenu, publie_at = t, publie_par = auth.uid();
  insert into public.site_versions (page, contenu, note, publie_par) values (p_page, p_contenu, left(coalesce(p_note, ''), 300), auth.uid());
  delete from public.site_brouillons where page = p_page;
  -- on garde les 60 dernières versions de chaque page
  delete from public.site_versions v where v.page = p_page and v.id not in
    (select id from public.site_versions where page = p_page order by created_at desc limit 60);
  return t;
end $$;
revoke execute on function public.publier_page(text, jsonb, text) from public, anon;
grant execute on function public.publier_page(text, jsonb, text) to authenticated;
