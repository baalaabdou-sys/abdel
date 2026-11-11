-- ═══════════════════════════════════════════════════════════════
--  Club 2AMECA — base de données, version 9 (à coller APRÈS schema-v8.sql)
--  Le bureau gère TOUS les événements depuis le tableau de bord
--  (affiche, programme, résumé, dates), et choisit les sections affichées.
--  SQL Editor → New query → coller → Run.
-- ═══════════════════════════════════════════════════════════════

-- Champs de présentation publique d'un événement
alter table public.formations add column if not exists resume      text not null default '';
alter table public.formations add column if not exists programme   text not null default '';   -- une ligne par point
alter table public.formations add column if not exists lieu_detail text not null default '';
alter table public.formations add column if not exists date_fin    date;
alter table public.formations add column if not exists affiche     text;                       -- dans le stockage « medias »

-- Réglage « sections » : sections affichées ou masquées sur les pages publiques
alter table public.parametres drop constraint if exists parametres_cle_check;
alter table public.parametres add constraint parametres_cle_check check (cle in ('club', 'contact', 'faq', 'sections'));
