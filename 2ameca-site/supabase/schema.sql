-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 1
--  À coller une seule fois dans Supabase : SQL Editor → New query → Run.
--
--  Rôles :
--    membre       : son profil, ses inscriptions, ses supports et attestations
--    responsable  : + gère les formations, les présences et les supports
--    admin        : + gère les membres et leurs rôles
-- ═══════════════════════════════════════════════════════════════

-- ── Tables ─────────────────────────────────────────────────────

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  prenom          text not null default '',
  nom             text not null default '',
  telephone       text,
  filiere         text,
  annee           text,
  role            text not null default 'membre' check (role in ('membre', 'responsable', 'admin')),
  consentement_at timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists public.formations (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(titre) between 2 and 200),
  type        text not null default 'formation' check (type in ('formation', 'atelier', 'evenement')),
  description text not null default '',
  date        date not null,
  heure_debut time,
  heure_fin   time,
  lieu        text not null default '',
  places      int check (places is null or places > 0),
  publiee     boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.inscriptions (
  formation_id         uuid not null references public.formations (id) on delete cascade,
  membre_id            uuid not null references public.profiles (id) on delete cascade,
  inscrit_at           timestamptz not null default now(),
  present              boolean not null default false,
  presence_validee_par uuid references public.profiles (id) on delete set null,
  presence_validee_at  timestamptz,
  primary key (formation_id, membre_id)
);
create index if not exists inscriptions_membre_idx on public.inscriptions (membre_id);

create table if not exists public.supports (
  id           uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations (id) on delete cascade,
  nom          text not null,
  chemin       text not null unique,   -- dans le stockage « supports » : <formation_id>/<fichier>
  taille       bigint,
  created_at   timestamptz not null default now()
);
create index if not exists supports_formation_idx on public.supports (formation_id);

-- Une attestation est créée automatiquement quand une présence est validée.
-- « restrict » : une formation qui a délivré des attestations ne peut pas être supprimée (historique).
create table if not exists public.attestations (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  formation_id uuid not null references public.formations (id) on delete restrict,
  membre_id    uuid not null references public.profiles (id) on delete cascade,
  delivree_at  timestamptz not null default now(),
  unique (formation_id, membre_id)
);

-- ── Fonctions d'aide pour les règles d'accès ───────────────────

create or replace function public.mon_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.est_bureau() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mon_role() in ('responsable', 'admin'), false)
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mon_role() = 'admin', false)
$$;

-- ── Profil créé automatiquement à l'inscription ────────────────

create or replace function public.creer_profil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, prenom, nom, telephone, filiere, annee, consentement_at)
  values (
    new.id, new.email,
    left(coalesce(new.raw_user_meta_data ->> 'prenom', ''), 80),
    left(coalesce(new.raw_user_meta_data ->> 'nom', ''), 80),
    left(new.raw_user_meta_data ->> 'telephone', 30),
    left(new.raw_user_meta_data ->> 'filiere', 80),
    left(new.raw_user_meta_data ->> 'annee', 40),
    case when new.raw_user_meta_data ->> 'consentement' = 'true' then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil();

-- ── Présences : qui a validé, quand, et attestation automatique ─

create or replace function public.suivi_presence() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.present is distinct from old.present then
    new.presence_validee_par := auth.uid();
    new.presence_validee_at  := case when new.present then now() end;
  end if;
  return new;
end $$;

drop trigger if exists inscriptions_suivi_presence on public.inscriptions;
create trigger inscriptions_suivi_presence
  before update on public.inscriptions
  for each row execute function public.suivi_presence();

create or replace function public.attestation_auto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.present then
    insert into public.attestations (formation_id, membre_id)
    values (new.formation_id, new.membre_id)
    on conflict (formation_id, membre_id) do nothing;
  elsif tg_op = 'UPDATE' and old.present then
    -- présence annulée (erreur de saisie) : l'attestation est retirée
    delete from public.attestations where formation_id = new.formation_id and membre_id = new.membre_id;
  end if;
  return new;
end $$;

drop trigger if exists inscriptions_attestation on public.inscriptions;
create trigger inscriptions_attestation
  after insert or update of present on public.inscriptions
  for each row execute function public.attestation_auto();

-- ── Actions réservées au bureau (appelées depuis le site) ──────

-- Valide (ou annule) la présence d'un membre ; l'inscrit automatiquement s'il ne l'était pas
-- (utile pour le scan du QR code à l'entrée). Renvoie le nom du membre.
create or replace function public.marquer_presence(p_formation uuid, p_membre uuid, p_present boolean default true)
returns text
language plpgsql security definer set search_path = public as $$
declare v_nom text;
begin
  if not public.est_bureau() then raise exception 'Réservé au bureau'; end if;
  select trim(prenom || ' ' || nom) into v_nom from public.profiles where id = p_membre;
  if v_nom is null then raise exception 'Membre introuvable'; end if;
  insert into public.inscriptions (formation_id, membre_id, present, presence_validee_par, presence_validee_at)
  values (p_formation, p_membre, p_present, auth.uid(), case when p_present then now() end)
  on conflict (formation_id, membre_id) do update set present = excluded.present;
  return v_nom;
end $$;

-- Change le rôle d'un membre (admin uniquement ; un admin ne peut pas se retirer lui-même ses droits).
create or replace function public.changer_role(p_membre uuid, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if p_role not in ('membre', 'responsable', 'admin') then raise exception 'Rôle inconnu'; end if;
  if p_membre = auth.uid() and p_role <> 'admin' then raise exception 'Vous ne pouvez pas retirer vos propres droits'; end if;
  update public.profiles set role = p_role where id = p_membre;
end $$;

-- Vérification publique d'une attestation par son code (page « Vérifier une attestation »).
create or replace function public.verifier_attestation(p_code text)
returns table (prenom text, nom text, titre text, type text, date date, delivree_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.prenom, p.nom, f.titre, f.type, f.date, a.delivree_at
  from public.attestations a
  join public.profiles p on p.id = a.membre_id
  join public.formations f on f.id = a.formation_id
  where a.code = upper(trim(p_code))
$$;

-- Nombre d'inscrits par formation publiée (visible de tous, sans les noms).
create or replace function public.nb_inscrits(p_formation uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.inscriptions i
  join public.formations f on f.id = i.formation_id
  where i.formation_id = p_formation and (f.publiee or public.est_bureau())
$$;

-- ── Règles d'accès (Row Level Security) ────────────────────────

alter table public.profiles     enable row level security;
alter table public.formations   enable row level security;
alter table public.inscriptions enable row level security;
alter table public.supports     enable row level security;
alter table public.attestations enable row level security;

-- Profils : chacun voit le sien ; le bureau voit tout le monde.
drop policy if exists profils_lecture on public.profiles;
create policy profils_lecture on public.profiles for select to authenticated
  using (id = auth.uid() or public.est_bureau());
drop policy if exists profils_modif on public.profiles;
create policy profils_modif on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Un membre ne peut modifier que ces colonnes (pas son rôle ni son e-mail).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (prenom, nom, telephone, filiere, annee) on public.profiles to authenticated;

-- Formations : les publiées sont visibles de tous ; le bureau voit et gère tout.
drop policy if exists formations_lecture on public.formations;
create policy formations_lecture on public.formations for select to anon, authenticated
  using (publiee or public.est_bureau());
drop policy if exists formations_gestion on public.formations;
create policy formations_gestion on public.formations for all to authenticated
  using (public.est_bureau()) with check (public.est_bureau());

-- Inscriptions : un membre s'inscrit lui-même à une formation publiée à venir,
-- et peut se désinscrire tant que sa présence n'est pas validée. Le bureau gère tout.
drop policy if exists inscriptions_lecture on public.inscriptions;
create policy inscriptions_lecture on public.inscriptions for select to authenticated
  using (membre_id = auth.uid() or public.est_bureau());
drop policy if exists inscriptions_ajout on public.inscriptions;
create policy inscriptions_ajout on public.inscriptions for insert to authenticated
  with check (
    public.est_bureau()
    or (
      membre_id = auth.uid() and present = false and presence_validee_par is null
      and exists (select 1 from public.formations f where f.id = formation_id and f.publiee and f.date >= current_date)
    )
  );
drop policy if exists inscriptions_retrait on public.inscriptions;
create policy inscriptions_retrait on public.inscriptions for delete to authenticated
  using (public.est_bureau() or (membre_id = auth.uid() and present = false));
drop policy if exists inscriptions_modif on public.inscriptions;
create policy inscriptions_modif on public.inscriptions for update to authenticated
  using (public.est_bureau()) with check (public.est_bureau());

-- Supports : visibles par le bureau et par les membres dont la présence est validée.
drop policy if exists supports_lecture on public.supports;
create policy supports_lecture on public.supports for select to authenticated
  using (
    public.est_bureau()
    or exists (select 1 from public.inscriptions i
               where i.formation_id = supports.formation_id and i.membre_id = auth.uid() and i.present)
  );
drop policy if exists supports_gestion on public.supports;
create policy supports_gestion on public.supports for all to authenticated
  using (public.est_bureau()) with check (public.est_bureau());

-- Attestations : chacun voit les siennes ; le bureau voit tout. Créées uniquement par le déclencheur.
drop policy if exists attestations_lecture on public.attestations;
create policy attestations_lecture on public.attestations for select to authenticated
  using (membre_id = auth.uid() or public.est_bureau());
revoke insert, update, delete on public.attestations from anon, authenticated;

-- ── Stockage des supports (fichiers privés) ────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('supports', 'supports', false, 52428800)   -- 50 Mo par fichier (limite du plan gratuit)
on conflict (id) do nothing;

drop policy if exists "supports : lecture" on storage.objects;
create policy "supports : lecture" on storage.objects for select to authenticated
  using (
    bucket_id = 'supports' and (
      public.est_bureau()
      or exists (select 1 from public.inscriptions i
                 where i.formation_id::text = (storage.foldername(name))[1]
                   and i.membre_id = auth.uid() and i.present)
    )
  );
drop policy if exists "supports : ajout" on storage.objects;
create policy "supports : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'supports' and public.est_bureau());
drop policy if exists "supports : suppression" on storage.objects;
create policy "supports : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'supports' and public.est_bureau());
