import { createClient, type User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config';

/** Client Supabase partagé par toutes les pages (navigateur uniquement). */
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Role = 'membre' | 'responsable' | 'admin';

export interface Profil {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  filiere: string | null;
  annee: string | null;
  role: Role;
  created_at: string;
}

export interface Formation {
  id: string;
  titre: string;
  type: 'formation' | 'atelier' | 'evenement';
  description: string;
  date: string;
  heure_debut: string | null;
  heure_fin: string | null;
  lieu: string;
  places: number | null;
  publiee: boolean;
  compte_rendu?: string;
  created_at: string;
}

export const TYPES: Record<Formation['type'], string> = {
  formation: 'Formation',
  atelier: 'Atelier',
  evenement: 'Événement',
};

export const ROLES: Record<Role, string> = {
  membre: 'Membre',
  responsable: 'Responsable',
  admin: 'Administrateur',
};

export const STATUTS_IDEE = { nouvelle: 'Nouvelle', etudiee: 'À l’étude', retenue: 'Retenue', realisee: 'Réalisée', ecartee: 'Écartée' } as const;
export const TYPES_IDEE = { projet: 'Projet', evenement: 'Événement', autre: 'Autre' } as const;
export const ACCES = { public: 'Public', membres: 'Membres', bureau: 'Bureau' } as const;
export const TYPES_CONTACT = { club: 'Club', partenaire: 'Partenaire', entreprise: 'Entreprise', autre: 'Autre' } as const;

export async function utilisateur(): Promise<User | null> {
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

export async function monProfil(): Promise<Profil | null> {
  const user = await utilisateur();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return (data as Profil) ?? null;
}

export const estBureau = (p: Profil | null) => !!p && (p.role === 'responsable' || p.role === 'admin');

/** Traduit les messages d'erreur courants de Supabase. */
export function messageErreur(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e ?? '');
  const t: [RegExp, string][] = [
    [/Invalid login credentials/i, 'E-mail ou mot de passe incorrect.'],
    [/Email not confirmed/i, 'Votre adresse e-mail n’est pas encore confirmée.'],
    [/User already registered/i, 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous.'],
    [/Password should be at least (\d+)/i, 'Le mot de passe doit contenir au moins 8 caractères.'],
    [/weak password|password is too weak/i, 'Mot de passe trop faible : utilisez au moins 8 caractères avec des lettres et des chiffres.'],
    [/Unable to validate email|invalid email/i, 'Adresse e-mail invalide.'],
    [/rate limit|too many requests/i, 'Trop de tentatives. Patientez quelques minutes puis réessayez.'],
    [/Failed to fetch|NetworkError|Load failed/i, 'Connexion impossible. Vérifiez votre connexion internet.'],
    [/row-level security|permission denied|not allowed/i, 'Vous n’avez pas les droits pour cette action.'],
    [/duplicate key/i, 'Cet élément existe déjà.'],
    [/violates foreign key.*attestations/i, 'Impossible : cette activité a déjà délivré des attestations.'],
  ];
  for (const [re, fr] of t) if (re.test(m)) return fr;
  return m || 'Une erreur est survenue.';
}
