-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 2 (à coller APRÈS schema.sql)
--  Galerie, partenaires, comptes-rendus, notifications, retours,
--  boîte à idées, messages de contact, bibliothèque de ressources,
--  gestion des membres par les administrateurs.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- ── Compte-rendu des activités réalisées ───────────────────────
alter table public.formations add column if not exists compte_rendu text not null default '';

-- ── Médias publics : photos de la galerie, logos des partenaires ─
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medias', 'medias', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "medias : ajout" on storage.objects;
create policy "medias : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'medias' and public.est_bureau());
drop policy if exists "medias : suppression" on storage.objects;
create policy "medias : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'medias' and public.est_bureau());

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  chemin       text not null unique,           -- dans le stockage « medias »
  legende      text not null default '',
  formation_id uuid references public.formations (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists photos_formation_idx on public.photos (formation_id);

create table if not exists public.partenaires (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(nom) between 1 and 120),
  description text not null default '',
  site        text,
  logo        text,                            -- dans le stockage « medias »
  ordre       int not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Notifications dans le site ─────────────────────────────────
-- membre_id vide = notification pour tous les membres.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  membre_id  uuid references public.profiles (id) on delete cascade,
  titre      text not null,
  message    text not null default '',
  lien       text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_membre_idx on public.notifications (membre_id, created_at desc);

create table if not exists public.notifications_lues (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  membre_id       uuid not null references public.profiles (id) on delete cascade,
  primary key (notification_id, membre_id)
);

-- ── Retours d'expérience, boîte à idées, messages de contact ───
create table if not exists public.retours (
  formation_id uuid not null references public.formations (id) on delete cascade,
  membre_id    uuid not null references public.profiles (id) on delete cascade,
  note         smallint not null check (note between 1 and 5),
  commentaire  text not null default '' check (length(commentaire) <= 2000),
  created_at   timestamptz not null default now(),
  primary key (formation_id, membre_id)
);

create table if not exists public.idees (
  id          uuid primary key default gen_random_uuid(),
  membre_id   uuid references public.profiles (id) on delete set null,
  type        text not null default 'projet' check (type in ('projet', 'evenement', 'autre')),
  titre       text not null check (length(titre) between 3 and 150),
  description text not null default '' check (length(description) <= 3000),
  statut      text not null default 'nouvelle' check (statut in ('nouvelle', 'etudiee', 'retenue', 'realisee', 'ecartee')),
  created_at  timestamptz not null default now()
);

create table if not exists public.messages_contact (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null check (length(nom) between 2 and 120),
  organisation text not null default '' check (length(organisation) <= 150),
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  type         text not null default 'autre' check (type in ('club', 'partenaire', 'entreprise', 'autre')),
  message      text not null check (length(message) between 10 and 4000),
  traite       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── Bibliothèque de ressources ─────────────────────────────────
-- acces : « public » (tout le monde), « membres » (comptes connectés), « bureau ».
create table if not exists public.ressources (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(titre) between 2 and 200),
  description text not null default '',
  categorie   text not null default 'Général',
  acces       text not null default 'membres' check (acces in ('public', 'membres', 'bureau')),
  chemin      text not null unique,            -- dans le stockage « ressources »
  nom_fichier text not null,
  taille      bigint,
  created_at  timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('ressources', 'ressources', false, 52428800)
on conflict (id) do nothing;

-- ── Notifications automatiques ─────────────────────────────────
create or replace function public.notif_formation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.publiee and new.date >= current_date and (tg_op = 'INSERT' or not old.publiee) then
    insert into public.notifications (titre, message, lien)
    values ('Nouvelle activité : ' || new.titre,
            to_char(new.date, 'DD/MM/YYYY') || coalesce(' à ' || to_char(new.heure_debut::interval, 'HH24"h"MI'), '') ||
            case when new.lieu <> '' then ' — ' || new.lieu else '' end || '. Inscrivez-vous depuis votre espace.',
            '/espace/');
  end if;
  return new;
end $$;
drop trigger if exists formations_notif on public.formations;
create trigger formations_notif after insert or update of publiee on public.formations
  for each row execute function public.notif_formation();

create or replace function public.notif_attestation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (membre_id, titre, message, lien)
  select new.membre_id, 'Attestation disponible', 'Votre attestation pour « ' || f.titre || ' » est prête à télécharger.', '/espace/#parcours'
  from public.formations f where f.id = new.formation_id;
  return new;
end $$;
drop trigger if exists attestations_notif on public.attestations;
create trigger attestations_notif after insert on public.attestations
  for each row execute function public.notif_attestation();

create or replace function public.notif_support() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (membre_id, titre, message, lien)
  select i.membre_id, 'Nouveau support : ' || new.nom, 'Ajouté pour « ' || f.titre || ' ».', '/espace/#parcours'
  from public.inscriptions i join public.formations f on f.id = i.formation_id
  where i.formation_id = new.formation_id and i.present;
  return new;
end $$;
drop trigger if exists supports_notif on public.supports;
create trigger supports_notif after insert on public.supports
  for each row execute function public.notif_support();

-- ── Gestion des membres par les administrateurs ────────────────
create or replace function public.admin_modifier_membre(
  p_membre uuid, p_prenom text, p_nom text, p_telephone text, p_filiere text, p_annee text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'Réservé aux administrateurs'; end if;
  update public.profiles set
    prenom = left(coalesce(p_prenom, ''), 80), nom = left(coalesce(p_nom, ''), 80),
    telephone = nullif(left(p_telephone, 30), ''), filiere = nullif(left(p_filiere, 80), ''), annee = nullif(left(p_annee, 40), '')
  where id = p_membre;
end $$;

-- Supprime le compte et toutes ses données (inscriptions, attestations…). Irréversible.
create or replace function public.admin_supprimer_membre(p_membre uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.est_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if p_membre = auth.uid() then raise exception 'Vous ne pouvez pas supprimer votre propre compte'; end if;
  delete from auth.users where id = p_membre;
end $$;

-- ── Règles d'accès ─────────────────────────────────────────────
alter table public.photos             enable row level security;
alter table public.partenaires        enable row level security;
alter table public.notifications      enable row level security;
alter table public.notifications_lues enable row level security;
alter table public.retours            enable row level security;
alter table public.idees              enable row level security;
alter table public.messages_contact   enable row level security;
alter table public.ressources         enable row level security;

-- Galerie et partenaires : visibles de tous, gérés par le bureau.
drop policy if exists photos_lecture on public.photos;
create policy photos_lecture on public.photos for select to anon, authenticated using (true);
drop policy if exists photos_gestion on public.photos;
create policy photos_gestion on public.photos for all to authenticated using (public.est_bureau()) with check (public.est_bureau());
drop policy if exists partenaires_lecture on public.partenaires;
create policy partenaires_lecture on public.partenaires for select to anon, authenticated using (true);
drop policy if exists partenaires_gestion on public.partenaires;
create policy partenaires_gestion on public.partenaires for all to authenticated using (public.est_bureau()) with check (public.est_bureau());

-- Notifications : chacun voit les siennes et celles adressées à tous ; le bureau publie les annonces.
drop policy if exists notifications_lecture on public.notifications;
create policy notifications_lecture on public.notifications for select to authenticated
  using (membre_id is null or membre_id = auth.uid() or public.est_bureau());
drop policy if exists notifications_annonce on public.notifications;
create policy notifications_annonce on public.notifications for insert to authenticated
  with check (public.est_bureau());
drop policy if exists notifications_suppression on public.notifications;
create policy notifications_suppression on public.notifications for delete to authenticated
  using (public.est_bureau());
drop policy if exists lues_lecture on public.notifications_lues;
create policy lues_lecture on public.notifications_lues for select to authenticated using (membre_id = auth.uid());
drop policy if exists lues_ajout on public.notifications_lues;
create policy lues_ajout on public.notifications_lues for insert to authenticated with check (membre_id = auth.uid());

-- Retours : seulement par les membres dont la présence est validée ; le bureau lit tout.
drop policy if exists retours_lecture on public.retours;
create policy retours_lecture on public.retours for select to authenticated
  using (membre_id = auth.uid() or public.est_bureau());
drop policy if exists retours_ajout on public.retours;
create policy retours_ajout on public.retours for insert to authenticated
  with check (membre_id = auth.uid() and exists (
    select 1 from public.inscriptions i where i.formation_id = retours.formation_id and i.membre_id = auth.uid() and i.present));
drop policy if exists retours_modif on public.retours;
create policy retours_modif on public.retours for update to authenticated
  using (membre_id = auth.uid()) with check (membre_id = auth.uid());

-- Boîte à idées : les membres proposent, le bureau lit et change le statut.
drop policy if exists idees_lecture on public.idees;
create policy idees_lecture on public.idees for select to authenticated
  using (membre_id = auth.uid() or public.est_bureau());
drop policy if exists idees_ajout on public.idees;
create policy idees_ajout on public.idees for insert to authenticated
  with check (membre_id = auth.uid() and statut = 'nouvelle');
drop policy if exists idees_gestion on public.idees;
create policy idees_gestion on public.idees for update to authenticated
  using (public.est_bureau()) with check (public.est_bureau());
drop policy if exists idees_suppression on public.idees;
create policy idees_suppression on public.idees for delete to authenticated using (public.est_bureau());

-- Messages de contact : tout le monde peut écrire, seul le bureau lit.
drop policy if exists contact_envoi on public.messages_contact;
create policy contact_envoi on public.messages_contact for insert to anon, authenticated
  with check (traite = false);
drop policy if exists contact_lecture on public.messages_contact;
create policy contact_lecture on public.messages_contact for select to authenticated using (public.est_bureau());
drop policy if exists contact_gestion on public.messages_contact;
create policy contact_gestion on public.messages_contact for update to authenticated using (public.est_bureau()) with check (public.est_bureau());
drop policy if exists contact_suppression on public.messages_contact;
create policy contact_suppression on public.messages_contact for delete to authenticated using (public.est_bureau());

-- Ressources : selon le niveau d'accès de chaque ressource.
drop policy if exists ressources_lecture on public.ressources;
create policy ressources_lecture on public.ressources for select to anon, authenticated
  using (acces = 'public' or (acces = 'membres' and auth.uid() is not null) or public.est_bureau());
drop policy if exists ressources_gestion on public.ressources;
create policy ressources_gestion on public.ressources for all to authenticated
  using (public.est_bureau()) with check (public.est_bureau());

drop policy if exists "ressources : lecture" on storage.objects;
create policy "ressources : lecture" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ressources' and exists (
    select 1 from public.ressources r where r.chemin = storage.objects.name
      and (r.acces = 'public' or (r.acces = 'membres' and auth.uid() is not null) or public.est_bureau())));
drop policy if exists "ressources : ajout" on storage.objects;
create policy "ressources : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'ressources' and public.est_bureau());
drop policy if exists "ressources : suppression" on storage.objects;
create policy "ressources : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'ressources' and public.est_bureau());
