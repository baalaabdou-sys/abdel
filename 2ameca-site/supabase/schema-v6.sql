-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 6 (à coller APRÈS schema-v5.sql)
--  Inscription à une activité → message dans l'espace + e-mail au membre,
--  avec le lien vers son attestation (disponible après validation de sa présence).
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- Inscription confirmée (sauf si le bureau l'ajoute directement comme présent :
-- il reçoit alors l'e-mail « Attestation disponible »).
create or replace function public.notif_inscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.present then return new; end if;
  insert into public.notifications (membre_id, titre, message, lien)
  select new.membre_id, 'Inscription confirmée : ' || f.titre,
    'Vous êtes inscrit(e) à « ' || f.titre || ' » le ' || public.date_fr(f.date, f.heure_debut)
      || case when f.lieu <> '' then ' — ' || f.lieu else '' end || '.' || E'\n\n'
      || 'Le jour de l’activité, présentez le QR code de votre espace à l’entrée. '
      || 'Dès que votre présence est validée, votre attestation est disponible à ce lien.',
    '/espace/#parcours'
  from public.formations f where f.id = new.formation_id;
  return new;
end $$;
drop trigger if exists inscriptions_notif on public.inscriptions;
create trigger inscriptions_notif after insert on public.inscriptions
  for each row execute function public.notif_inscription();

-- E-mail de chaque notification personnelle : bouton adapté au message.
create or replace function public.notification_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record; bouton text;
begin
  if new.membre_id is null then return new; end if;
  select email, trim(prenom || ' ' || nom) as nom, emails_actifs into p from public.profiles where id = new.membre_id;
  if p.email is null or not p.emails_actifs then return new; end if;
  bouton := case
    when new.titre like 'Inscription confirmée%' then 'Mon attestation'
    when new.titre like 'Attestation disponible%' then 'Télécharger mon attestation'
    when new.titre like 'Nouveau support%' then 'Voir les supports'
    else 'Ouvrir mon espace' end;
  perform public.envoyer_email(p.email, p.nom, new.titre, new.message, new.lien, bouton);
  return new;
end $$;
