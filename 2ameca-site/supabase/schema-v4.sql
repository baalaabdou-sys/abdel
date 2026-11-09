-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 4 (à coller APRÈS schema-v3.sql)
--  • Annulation d'une activité (réversible) et suppression avec avis aux inscrits
--  • Avis aux inscrits quand la date, l'heure ou le lieu changent
--  • E-mails via Brevo (gratuit : 300 e-mails/jour), envoyés par la base elle-même
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;

-- ── Annulation ─────────────────────────────────────────────────
alter table public.formations add column if not exists annulee boolean not null default false;
alter table public.formations add column if not exists motif_annulation text not null default '';

-- On ne peut plus s'inscrire à une activité annulée.
drop policy if exists inscriptions_ajout on public.inscriptions;
create policy inscriptions_ajout on public.inscriptions for insert to authenticated
  with check (
    public.est_bureau()
    or (
      membre_id = auth.uid() and present = false and presence_validee_par is null
      and exists (select 1 from public.formations f where f.id = formation_id and f.publiee and not f.annulee and f.date >= current_date)
    )
  );

-- ── Préférence e-mail de chaque membre ─────────────────────────
alter table public.profiles add column if not exists emails_actifs boolean not null default true;
grant update (emails_actifs) on public.profiles to authenticated;

-- ── Avis automatiques aux inscrits ─────────────────────────────
create or replace function public.date_fr(d date, h time) returns text
language sql immutable as $$
  select to_char(d, 'DD/MM/YYYY') || coalesce(' à ' || to_char(h::interval, 'HH24"h"MI'), '')
$$;

create or replace function public.prevenir_inscrits(p_formation uuid, p_titre text, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (membre_id, titre, message, lien)
  select i.membre_id, p_titre, p_message, '/espace/'
  from public.inscriptions i where i.formation_id = p_formation;
$$;

create or replace function public.suivi_formation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Annulation / rétablissement
  if new.annulee and not old.annulee then
    perform public.prevenir_inscrits(new.id, 'Activité annulée : ' || new.titre,
      'L’activité prévue le ' || public.date_fr(new.date, new.heure_debut) || ' est annulée.' ||
      case when new.motif_annulation <> '' then ' Motif : ' || new.motif_annulation else '' end);
  elsif old.annulee and not new.annulee then
    perform public.prevenir_inscrits(new.id, 'Activité rétablie : ' || new.titre,
      'Bonne nouvelle : l’activité a bien lieu le ' || public.date_fr(new.date, new.heure_debut) ||
      case when new.lieu <> '' then ' — ' || new.lieu else '' end || '. Votre inscription est conservée.');
  -- Changement de date, d'heure ou de lieu d'une activité publiée à venir
  elsif new.publiee and not new.annulee and new.date >= current_date
    and (new.date, new.heure_debut, new.lieu) is distinct from (old.date, old.heure_debut, old.lieu) then
    perform public.prevenir_inscrits(new.id, 'Changement : ' || new.titre,
      'Nouvelle date : ' || public.date_fr(new.date, new.heure_debut) ||
      case when new.lieu <> '' then ' — ' || new.lieu else '' end || '.');
  end if;
  return new;
end $$;
drop trigger if exists formations_suivi on public.formations;
create trigger formations_suivi after update on public.formations
  for each row execute function public.suivi_formation();

create or replace function public.suppression_formation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.date >= current_date and not old.annulee then
    perform public.prevenir_inscrits(old.id, 'Activité annulée : ' || old.titre,
      'L’activité prévue le ' || public.date_fr(old.date, old.heure_debut) || ' est annulée et a été retirée du programme.');
  end if;
  return old;
end $$;
drop trigger if exists formations_suppression on public.formations;
create trigger formations_suppression before delete on public.formations
  for each row execute function public.suppression_formation();

-- ── E-mails via Brevo ──────────────────────────────────────────
-- La clé API Brevo et l'adresse d'envoi sont rangées, chiffrées, dans le coffre-fort
-- de Supabase (Vault) : voir le fichier supabase/brevo.sql. Tant qu'elles n'y sont pas,
-- aucun e-mail n'est envoyé (les notifications dans le site fonctionnent quand même).

create or replace function public.html_echappe(t text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

create or replace function public.secret(p_nom text) returns text
language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_nom limit 1
$$;
revoke execute on function public.secret(text) from public, anon, authenticated;

create or replace function public.envoyer_email(p_to text, p_nom text, p_sujet text, p_texte text, p_lien text default null)
returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare
  cle text := public.secret('brevo_api_key');
  expediteur text := public.secret('brevo_expediteur');
  site text := coalesce(public.secret('site_url'), 'https://2amcclub.netlify.app');
  html text;
begin
  if cle is null or expediteur is null or p_to is null then return null; end if;
  html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2D2D2D">'
    || '<div style="background:#04223A;color:#fff;padding:18px 22px;font-weight:bold;letter-spacing:.08em">CLUB 2AMECA</div>'
    || '<div style="padding:22px;border:1px solid #dfe8f0;border-top:0">'
    || '<p style="margin:0 0 6px">Bonjour ' || public.html_echappe(p_nom) || ',</p>'
    || '<h2 style="color:#0A4A7A;font-size:20px;margin:14px 0 8px">' || public.html_echappe(p_sujet) || '</h2>'
    || '<p style="line-height:1.5">' || public.html_echappe(p_texte) || '</p>'
    || '<p style="margin:22px 0"><a href="' || public.html_echappe(site || coalesce(p_lien, '/espace/'))
    || '" style="background:#0A4A7A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block">Ouvrir mon espace</a></p>'
    || '<p style="font-size:12px;color:#777;margin-top:26px">Vous recevez cet e-mail car vous êtes inscrit(e) au Club 2AMECA (FSAC). '
    || 'Pour ne plus recevoir d’e-mails : Mon espace → Mon profil.</p></div></div>';
  return net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', cle, 'Content-Type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'Club 2AMECA', 'email', expediteur),
      'to', jsonb_build_array(jsonb_build_object('email', p_to, 'name', coalesce(nullif(p_nom, ''), p_to))),
      'subject', p_sujet, 'htmlContent', html, 'textContent', p_texte || E'\n\n' || site || coalesce(p_lien, '/espace/'))
  );
end $$;
revoke execute on function public.envoyer_email(text, text, text, text, text) from public, anon, authenticated;

-- Chaque notification personnelle part aussi par e-mail (si le membre ne l'a pas désactivé).
-- Les annonces à tous restent dans le site, pour rester sous la limite gratuite de Brevo.
create or replace function public.notification_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.membre_id is null then return new; end if;
  select email, trim(prenom || ' ' || nom) as nom, emails_actifs into p from public.profiles where id = new.membre_id;
  if p.email is not null and p.emails_actifs then
    perform public.envoyer_email(p.email, p.nom, new.titre, new.message, new.lien);
  end if;
  return new;
end $$;
drop trigger if exists notifications_email on public.notifications;
create trigger notifications_email after insert on public.notifications
  for each row execute function public.notification_email();

-- Bouton « Envoyer un e-mail de test » du tableau de bord (bureau) : e-mail à soi-même.
create or replace function public.email_test() returns text
language plpgsql security definer set search_path = public as $$
declare p record; v_requete bigint;
begin
  if not public.est_bureau() then raise exception 'Réservé au bureau'; end if;
  if public.secret('brevo_api_key') is null or public.secret('brevo_expediteur') is null then
    return 'non_configure';
  end if;
  select pr.email, trim(pr.prenom || ' ' || pr.nom) as nom into p from public.profiles pr where pr.id = auth.uid();
  v_requete := public.envoyer_email(p.email, p.nom, 'E-mail de test', 'Si vous lisez ce message, les e-mails du site du Club 2AMECA fonctionnent.', '/bureau/');
  return 'envoye:' || v_requete;
end $$;

-- Derniers envois (code de réponse de Brevo), pour vérifier que tout fonctionne.
create or replace function public.emails_recents()
returns table (quand timestamptz, statut int, erreur text)
language sql stable security definer set search_path = public, net as $$
  select r.created, r.status_code, left(coalesce(r.error_msg, case when r.status_code >= 300 then r.content::text end), 300)
  from net._http_response r
  where public.est_bureau()
  order by r.created desc limit 10
$$;
