-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — connexion à Brevo (e-mails), à faire UNE fois
--  1. Remplacez les deux valeurs entre guillemets ci-dessous.
--  2. SQL Editor → New query → coller → Run.
--  La clé est stockée chiffrée dans le coffre-fort de Supabase (Vault).
--  Ne l'envoyez jamais par message et ne la mettez jamais dans le code du site.
-- ═══════════════════════════════════════════════════════════════

select vault.create_secret('COLLEZ_ICI_LA_CLE_API_BREVO', 'brevo_api_key');
select vault.create_secret('adresse.verifiee@gmail.com', 'brevo_expediteur');

-- Pour CHANGER plus tard une valeur déjà enregistrée, utilisez plutôt :
-- select vault.update_secret((select id from vault.secrets where name = 'brevo_api_key'), 'NOUVELLE_CLE');
-- select vault.update_secret((select id from vault.secrets where name = 'brevo_expediteur'), 'nouvelle.adresse@gmail.com');
