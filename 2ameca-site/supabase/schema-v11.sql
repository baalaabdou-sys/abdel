-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 11 (à coller APRÈS schema-v10.sql)
--  Suppression des attestations : plus de création automatique, plus de notification
--  ni d'e-mail « Attestation disponible », plus de page de vérification.
--  Les présences (inscriptions.present) restent enregistrées.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- 1. Plus de création automatique quand une présence est validée
drop trigger if exists inscriptions_attestation on public.inscriptions;
drop function if exists public.attestation_auto();

-- 2. Plus de notification « Attestation disponible »
drop trigger if exists attestations_notif on public.attestations;
drop function if exists public.notif_attestation();

-- 3. Plus de vérification publique par code
drop function if exists public.verifier_attestation(text);

-- 4. Les attestations déjà délivrées et leurs notifications sont effacées (irréversible)
delete from public.notifications where titre like 'Attestation disponible%';
drop table if exists public.attestations;

-- 5. E-mail de confirmation d'inscription : sans mention d'attestation
create or replace function public.notif_inscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.present then return new; end if;
  insert into public.notifications (membre_id, titre, message, lien)
  select new.membre_id, 'Inscription confirmée : ' || f.titre,
    'Vous êtes inscrit(e) à « ' || f.titre || ' » le ' || public.date_fr(f.date, f.heure_debut)
      || case when f.lieu <> '' then ' — ' || f.lieu else '' end || '.' || E'\n\n'
      || 'Le jour de l’activité, présentez votre QR code à l’entrée (ci-dessous dans cet e-mail, ou dans « Mon espace »).',
    '/espace/#parcours'
  from public.formations f where f.id = new.formation_id;
  return new;
end $$;

-- 6. Bouton des e-mails : « Mon espace » au lieu de « Mon attestation »
create or replace function public.notification_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record; bouton text; qr uuid;
begin
  if new.membre_id is null then return new; end if;
  select email, trim(prenom || ' ' || nom) as nom, emails_actifs into p from public.profiles where id = new.membre_id;
  if p.email is null or not p.emails_actifs then return new; end if;
  bouton := case
    when new.titre like 'Nouveau support%' then 'Voir les supports'
    else 'Ouvrir mon espace' end;
  qr := case when new.titre like 'Inscription confirmée%' then new.membre_id end;
  perform public.envoyer_email(p.email, p.nom, new.titre, new.message, new.lien, bouton, qr);
  return new;
end $$;
