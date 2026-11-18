-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 12 (à coller APRÈS schema-v11.sql)
--  Séances : présence par QR code, séparée des événements.
--  • Créées par le bureau (responsables et administrateurs), jamais à une date passée.
--  • « Séance terminée » : chaque membre (rôle « membre ») non scanné devient absent ;
--    les responsables et administrateurs sont toujours comptés présents.
--  • Invisibles pour les membres.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.seances (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(trim(nom)) between 1 and 120),
  date        date not null,
  terminee    boolean not null default false,
  terminee_at timestamptz,
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists seances_date_idx on public.seances (date desc, created_at desc);

create table if not exists public.seance_presences (
  seance_id  uuid not null references public.seances (id) on delete cascade,
  membre_id  uuid not null references public.profiles (id) on delete cascade,
  present    boolean not null default true,
  scanne_at  timestamptz,
  valide_par uuid references public.profiles (id) on delete set null,
  primary key (seance_id, membre_id)
);

-- Jamais de date passée (heure du Maroc), à la création comme à la modification de la date.
create or replace function public.seance_date_valide() returns trigger
language plpgsql as $$
begin
  if new.date < (now() at time zone 'Africa/Casablanca')::date
     and (tg_op = 'INSERT' or new.date is distinct from old.date) then
    raise exception 'La date d’une séance ne peut pas être dans le passé';
  end if;
  return new;
end $$;
drop trigger if exists seances_date on public.seances;
create trigger seances_date before insert or update of date on public.seances
  for each row execute function public.seance_date_valide();

-- Réservé au bureau (les membres ne voient ni les séances ni leurs absences).
alter table public.seances enable row level security;
alter table public.seance_presences enable row level security;
drop policy if exists seances_bureau on public.seances;
create policy seances_bureau on public.seances for all to authenticated
  using (public.est_bureau()) with check (public.est_bureau());
drop policy if exists seance_presences_lecture on public.seance_presences;
create policy seance_presences_lecture on public.seance_presences for select to authenticated using (public.est_bureau());
revoke insert, update, delete on public.seance_presences from anon, authenticated;

-- Scan ou correction à la main. Renvoie le nom du membre et s'il était déjà présent.
create or replace function public.marquer_presence_seance(p_seance uuid, p_membre uuid, p_present boolean default true, p_manuel boolean default false)
returns table (nom text, deja boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_nom text; v_role text; v_terminee boolean; v_deja boolean;
begin
  if not public.est_bureau() then raise exception 'Réservé au bureau'; end if;
  select terminee into v_terminee from public.seances where id = p_seance;
  if v_terminee is null then raise exception 'Séance introuvable'; end if;
  if v_terminee and not p_manuel then raise exception 'Séance terminée : rouvrez-la pour scanner'; end if;
  select trim(prenom || ' ' || p.nom), role into v_nom, v_role from public.profiles p where id = p_membre;
  if v_nom is null then raise exception 'Membre introuvable'; end if;
  if not p_present and v_role in ('responsable', 'admin') then
    raise exception 'Les responsables et administrateurs sont toujours comptés présents';
  end if;
  select present into v_deja from public.seance_presences where seance_id = p_seance and membre_id = p_membre;
  insert into public.seance_presences (seance_id, membre_id, present, scanne_at, valide_par)
  values (p_seance, p_membre, p_present, case when p_present and not p_manuel then now() end, auth.uid())
  on conflict (seance_id, membre_id) do update set
    present = excluded.present,
    scanne_at = case when excluded.present then coalesce(seance_presences.scanne_at, excluded.scanne_at) end,
    valide_par = excluded.valide_par;
  return query select coalesce(v_nom, 'Membre'), coalesce(v_deja, false) and p_present;
end $$;

-- « Séance terminée » : absents pour les membres non scannés, bureau toujours présent.
create or replace function public.terminer_seance(p_seance uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_bureau() then raise exception 'Réservé au bureau'; end if;
  if not exists (select 1 from public.seances where id = p_seance) then raise exception 'Séance introuvable'; end if;
  insert into public.seance_presences (seance_id, membre_id, present, valide_par)
  select p_seance, p.id, false, auth.uid() from public.profiles p
  where p.role = 'membre' on conflict (seance_id, membre_id) do nothing;
  insert into public.seance_presences (seance_id, membre_id, present, valide_par)
  select p_seance, p.id, true, auth.uid() from public.profiles p
  where p.role in ('responsable', 'admin')
  on conflict (seance_id, membre_id) do update set present = true;
  update public.seances set terminee = true, terminee_at = now() where id = p_seance;
end $$;

revoke execute on function public.marquer_presence_seance(uuid, uuid, boolean, boolean) from public, anon;
revoke execute on function public.terminer_seance(uuid) from public, anon;
grant execute on function public.marquer_presence_seance(uuid, uuid, boolean, boolean) to authenticated;
grant execute on function public.terminer_seance(uuid) to authenticated;
