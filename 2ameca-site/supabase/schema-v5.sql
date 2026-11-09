-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 5 (à coller APRÈS schema-v4.sql)
--  Nouvelle activité publiée → e-mail à tous les membres avec un bouton
--  « Je m'inscris » qui les inscrit en un geste.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- L'e-mail accepte maintenant le texte du bouton (on remplace l'ancienne version).
drop function if exists public.envoyer_email(text, text, text, text, text);

create or replace function public.envoyer_email(
  p_to text, p_nom text, p_sujet text, p_texte text, p_lien text default null, p_bouton text default 'Ouvrir mon espace')
returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare
  cle text := public.secret('brevo_api_key');
  expediteur text := public.secret('brevo_expediteur');
  site text := coalesce(public.secret('site_url'), 'https://2amcclub.netlify.app');
  lien text := site || coalesce(p_lien, '/espace/');
  html text;
begin
  if cle is null or expediteur is null or p_to is null then return null; end if;
  html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2D2D2D">'
    || '<div style="background:#04223A;color:#fff;padding:18px 22px;font-weight:bold;letter-spacing:.08em">CLUB 2AMECA</div>'
    || '<div style="padding:22px;border:1px solid #dfe8f0;border-top:0">'
    || '<p style="margin:0 0 6px">Bonjour ' || public.html_echappe(p_nom) || ',</p>'
    || '<h2 style="color:#0A4A7A;font-size:20px;margin:14px 0 8px">' || public.html_echappe(p_sujet) || '</h2>'
    || '<p style="line-height:1.5;white-space:pre-line">' || public.html_echappe(p_texte) || '</p>'
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
revoke execute on function public.envoyer_email(text, text, text, text, text, text) from public, anon, authenticated;

-- Nouvelle activité publiée : notification dans le site (comme avant) + e-mail à chaque membre.
create or replace function public.notif_formation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m record;
  quand text := public.date_fr(new.date, new.heure_debut);
  texte text;
begin
  if new.publiee and not coalesce(new.annulee, false) and new.date >= current_date and (tg_op = 'INSERT' or not old.publiee) then
    insert into public.notifications (titre, message, lien)
    values ('Nouvelle activité : ' || new.titre,
            quand || case when new.lieu <> '' then ' — ' || new.lieu else '' end || '. Inscrivez-vous depuis votre espace.',
            '/espace/');
    texte := quand || case when new.lieu <> '' then ' — ' || new.lieu else '' end
      || case when new.description <> '' then E'\n\n' || new.description else '' end
      || case when new.places is not null then E'\n\nPlaces limitées : ' || new.places || '.' else '' end;
    for m in select email, trim(prenom || ' ' || nom) as nom from public.profiles where emails_actifs and email is not null loop
      perform public.envoyer_email(m.email, m.nom, 'Nouvelle activité : ' || new.titre, texte,
        '/espace/?inscrire=' || new.id, 'Je m’inscris');
    end loop;
  end if;
  return new;
end $$;
