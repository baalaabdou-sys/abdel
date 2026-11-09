-- Correctif : fonction du bouton « M’envoyer un e-mail de test ». SQL Editor → New query → coller → Run.

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

