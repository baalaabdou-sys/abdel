-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 7 (à coller APRÈS schema-v6.sql)
--  L'e-mail « Inscription confirmée » contient le QR code d'entrée du membre.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- L'e-mail accepte maintenant une image (le QR code) : on remplace l'ancienne version.
drop function if exists public.envoyer_email(text, text, text, text, text, text);

create or replace function public.envoyer_email(
  p_to text, p_nom text, p_sujet text, p_texte text, p_lien text default null,
  p_bouton text default 'Ouvrir mon espace', p_qr uuid default null)
returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare
  cle text := public.secret('brevo_api_key');
  expediteur text := public.secret('brevo_expediteur');
  site text := coalesce(public.secret('site_url'), 'https://2amcclub.netlify.app');
  lien text := site || coalesce(p_lien, '/espace/');
  bloc_qr text := '';
  html text;
begin
  if cle is null or expediteur is null or p_to is null then return null; end if;
  if p_qr is not null then
    bloc_qr := '<div style="margin:22px 0;padding:18px;border:1px solid #dfe8f0;border-radius:12px;text-align:center">'
      || '<p style="margin:0 0 10px;font-weight:bold;color:#04223A;letter-spacing:.06em">VOTRE QR CODE D’ENTRÉE</p>'
      || '<img src="' || site || '/qr/?m=' || p_qr || '" width="200" height="200" alt="QR code d’entrée" style="display:block;margin:0 auto;border:0">'
      || '<p style="margin:10px 0 0;font-size:13px;color:#555">Présentez-le à l’entrée : un responsable le scanne pour valider votre présence.</p></div>';
  end if;
  html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2D2D2D">'
    || '<div style="background:#04223A;color:#fff;padding:18px 22px;font-weight:bold;letter-spacing:.08em">CLUB 2AMECA</div>'
    || '<div style="padding:22px;border:1px solid #dfe8f0;border-top:0">'
    || '<p style="margin:0 0 6px">Bonjour ' || public.html_echappe(p_nom) || ',</p>'
    || '<h2 style="color:#0A4A7A;font-size:20px;margin:14px 0 8px">' || public.html_echappe(p_sujet) || '</h2>'
    || '<p style="line-height:1.5;white-space:pre-line">' || public.html_echappe(p_texte) || '</p>'
    || bloc_qr
    || '<p style="margin:22px 0"><a href="' || public.html_echappe(lien)
    || '" style="background:#0A4A7A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:bold">'
    || public.html_echappe(p_bouton) || '</a></p>'
    || '<p style="font-size:12px;color:#777;margin-top:26px">Vous recevez cet e-mail car vous êtes membre du Club 2AMECA (FSAC). '
    || 'Pour ne plus recevoir d’e-mails : Mon espace → Mon profil.</p></div></div>';
  return net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', cle, 'Content-Type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'Club 2AMECA', 'email', expediteur),
      'to', jsonb_build_array(jsonb_build_object('email', p_to, 'name', coalesce(nullif(p_nom, ''), p_to))),
      'subject', p_sujet, 'htmlContent', html,
      'textContent', p_texte || E'\n\n' || p_bouton || ' : ' || lien)
  );
end $$;
revoke execute on function public.envoyer_email(text, text, text, text, text, text, uuid) from public, anon, authenticated;

-- Le texte de l'inscription renvoie maintenant au QR code de l'e-mail.
create or replace function public.notif_inscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.present then return new; end if;
  insert into public.notifications (membre_id, titre, message, lien)
  select new.membre_id, 'Inscription confirmée : ' || f.titre,
    'Vous êtes inscrit(e) à « ' || f.titre || ' » le ' || public.date_fr(f.date, f.heure_debut)
      || case when f.lieu <> '' then ' — ' || f.lieu else '' end || '.' || E'\n\n'
      || 'Le jour de l’activité, présentez votre QR code à l’entrée (ci-dessous dans cet e-mail, ou dans « Mon espace »). '
      || 'Dès que votre présence est validée, votre attestation est disponible.',
    '/espace/#parcours'
  from public.formations f where f.id = new.formation_id;
  return new;
end $$;

-- E-mail de chaque notification personnelle ; le QR code est ajouté à la confirmation d'inscription.
create or replace function public.notification_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare p record; bouton text; qr uuid;
begin
  if new.membre_id is null then return new; end if;
  select email, trim(prenom || ' ' || nom) as nom, emails_actifs into p from public.profiles where id = new.membre_id;
  if p.email is null or not p.emails_actifs then return new; end if;
  bouton := case
    when new.titre like 'Inscription confirmée%' then 'Mon attestation'
    when new.titre like 'Attestation disponible%' then 'Télécharger mon attestation'
    when new.titre like 'Nouveau support%' then 'Voir les supports'
    else 'Ouvrir mon espace' end;
  qr := case when new.titre like 'Inscription confirmée%' then new.membre_id end;
  perform public.envoyer_email(p.email, p.nom, new.titre, new.message, new.lien, bouton, qr);
  return new;
end $$;
