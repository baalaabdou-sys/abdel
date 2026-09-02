'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, Users, Target, ScrollText, Plus, Trash2, Gauge, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { Role } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/rbac';
import { INSURANCE_TYPES, insuranceLabel } from '@/lib/domain';
import {
  updateWorkspaceAction, updateCompliancePolicyAction, updateDailyGoalAction,
  inviteMemberAction, updateMemberRoleAction, removeMemberAction,
  updateProductsAction, purgeDemoDataAction,
} from '@/server/actions/settings';
import { cn } from '@/lib/utils';
import type { InsuranceType } from '@prisma/client';

type Policy = {
  requireExplicitConsent: boolean; allowUnknownConsent: boolean; requireSourceRecorded: boolean;
  allowCatchAll: boolean; allowRisky: boolean; allowUnverified: boolean;
  blockOnUnknownConsent: boolean; blockOnMissingSource: boolean; blockOnLowReadiness: boolean;
  minReadinessScore: number; retentionMonths: number;
  legalNotice: string; privacyUrl: string; dpoEmail: string;
};

const DEFAULT_POLICY: Policy = {
  requireExplicitConsent: true, allowUnknownConsent: false, requireSourceRecorded: true,
  allowCatchAll: true, allowRisky: false, allowUnverified: true,
  blockOnUnknownConsent: true, blockOnMissingSource: false, blockOnLowReadiness: true,
  minReadinessScore: 60, retentionMonths: 36, legalNotice: '', privacyUrl: '', dpoEmail: '',
};

export function SettingsView({
  workspace, policy: initialPolicy, members, products, goal: initialGoal, auditLogs, usage,
  currentUserId, currentRole, canWrite, canManageMembers, canManageWorkspace, canReadAudit,
}: {
  workspace: { id: string; name: string; slug: string; logoUrl: string | null; locale: string; timezone: string; isDemo: boolean };
  policy: Policy | null;
  members: { userId: string; name: string; email: string; role: Role; lastLoginAt: string | null }[];
  products: { type: InsuranceType; label: string; active: boolean }[];
  goal: { minTarget: number; stretchTarget: number };
  auditLogs: { id: string; action: string; entityType: string; summary: string; userName: string; createdAt: string }[];
  usage: { kind: string; quantity: number }[];
  currentUserId: string; currentRole: Role;
  canWrite: boolean; canManageMembers: boolean; canManageWorkspace: boolean; canReadAudit: boolean;
}) {
  const router = useRouter();
  const [ws, setWs] = React.useState(workspace);
  const [policy, setPolicy] = React.useState(initialPolicy ?? DEFAULT_POLICY);
  const [goal, setGoal] = React.useState(initialGoal);
  const [activeProducts, setActiveProducts] = React.useState(products.filter((p) => p.active).map((p) => p.type));
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [invite, setInvite] = React.useState({ email: '', name: '', role: 'SALES' as Role, password: '' });
  const [removing, setRemoving] = React.useState<{ userId: string; name: string } | null>(null);
  const [purging, setPurging] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  return (
    <Tabs defaultValue="workspace">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="workspace"><Building2 /> Espace</TabsTrigger>
        <TabsTrigger value="compliance"><ShieldCheck /> Conformité</TabsTrigger>
        <TabsTrigger value="goals"><Target /> Objectifs</TabsTrigger>
        <TabsTrigger value="products"><Package /> Produits</TabsTrigger>
        <TabsTrigger value="team"><Users /> Équipe</TabsTrigger>
        <TabsTrigger value="usage"><Gauge /> Consommation</TabsTrigger>
        {canReadAudit ? <TabsTrigger value="audit"><ScrollText /> Journal d’audit</TabsTrigger> : null}
      </TabsList>

      {/* ── Espace de travail ── */}
      <TabsContent value="workspace" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Informations de l’espace</CardTitle>
            <CardDescription>Nom et logo affichés dans l’application et sur vos landing pages.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nom de la société</Label>
              <Input value={ws.name} disabled={!canWrite} onChange={(e) => setWs((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo (URL)</Label>
              <Input value={ws.logoUrl ?? ''} disabled={!canWrite} placeholder="https://…/logo.png"
                onChange={(e) => setWs((v) => ({ ...v, logoUrl: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Langue par défaut</Label>
              <Select value={ws.locale} disabled={!canWrite} onValueChange={(v) => setWs((s) => ({ ...s, locale: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuseau horaire</Label>
              <Input value={ws.timezone} disabled={!canWrite} onChange={(e) => setWs((v) => ({ ...v, timezone: e.target.value }))} />
            </div>
            {canWrite ? (
              <div className="sm:col-span-2">
                <Button
                  loading={busy === 'ws'}
                  onClick={async () => {
                    setBusy('ws');
                    const r = await updateWorkspaceAction({ name: ws.name, logoUrl: ws.logoUrl ?? '', locale: ws.locale, timezone: ws.timezone });
                    setBusy(null);
                    if (r.ok) { toast.success('Espace mis à jour'); router.refresh(); } else toast.error(r.error);
                  }}
                >
                  Enregistrer
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {workspace.isDemo && canManageWorkspace ? (
          <Card className="border-warning/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-warning">Données de démonstration</CardTitle>
              <CardDescription>
                Cet espace contient des données de démonstration, identifiées par le marqueur DÉMO et
                exclues de vos analyses de production. Supprimez-les avant la mise en production réelle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setPurging(true)}>
                <Trash2 /> Supprimer toutes les données de démonstration
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </TabsContent>

      {/* ── Conformité ── */}
      <TabsContent value="compliance" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Règles d’éligibilité des campagnes</CardTitle>
            <CardDescription>
              Ces règles déterminent qui peut recevoir vos emails. ASSURLEAD AI applique votre politique —
              il ne détermine pas à votre place ce que la loi vous autorise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <PolicyToggle
              label="Exiger un consentement enregistré"
              help="Seuls les contacts dont le consentement email est enregistré peuvent être ciblés."
              checked={policy.requireExplicitConsent} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, requireExplicitConsent: v }))}
            />
            <PolicyToggle
              label="Autoriser les contacts au consentement inconnu"
              help="À n’activer que si vous disposez d’une autre base valable pour les contacter."
              checked={policy.allowUnknownConsent} disabled={!canWrite || !policy.requireExplicitConsent}
              onChange={(v) => setPolicy((p) => ({ ...p, allowUnknownConsent: v }))}
            />
            <PolicyToggle
              label="Exiger une source enregistrée"
              help="Exclut les contacts dont la provenance n’est pas documentée."
              checked={policy.requireSourceRecorded} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, requireSourceRecorded: v }))}
            />
            <div className="my-2 border-t" />
            <PolicyToggle
              label="Autoriser les adresses catch-all"
              help="Le domaine accepte tout : l’existence de la boîte n’est pas confirmée."
              checked={policy.allowCatchAll} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, allowCatchAll: v }))}
            />
            <PolicyToggle
              label="Autoriser les adresses risquées"
              help="Adresses génériques ou signalées : augmentent le risque de rebond."
              checked={policy.allowRisky} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, allowRisky: v }))}
            />
            <PolicyToggle
              label="Autoriser les adresses non vérifiées"
              help="Désactiver impose une vérification préalable de toute la base."
              checked={policy.allowUnverified} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, allowUnverified: v }))}
            />
            <p className="rounded-md bg-muted/60 p-2 text-[10px] text-muted-foreground">
              Les adresses INVALIDES et les contacts de la liste de suppression sont toujours exclus.
              Ce comportement n’est pas configurable.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Blocage au lancement</CardTitle>
            <CardDescription>Quels avertissements empêchent le lancement d’une campagne.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <PolicyToggle
              label="Bloquer si des consentements sont inconnus"
              checked={policy.blockOnUnknownConsent} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, blockOnUnknownConsent: v }))}
            />
            <PolicyToggle
              label="Bloquer si des provenances manquent"
              checked={policy.blockOnMissingSource} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, blockOnMissingSource: v }))}
            />
            <PolicyToggle
              label="Bloquer sous un score de préparation minimum"
              checked={policy.blockOnLowReadiness} disabled={!canWrite}
              onChange={(v) => setPolicy((p) => ({ ...p, blockOnLowReadiness: v }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Score de préparation minimum</Label>
                <Input type="number" min={0} max={100} value={policy.minReadinessScore} disabled={!canWrite || !policy.blockOnLowReadiness}
                  onChange={(e) => setPolicy((p) => ({ ...p, minReadinessScore: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Durée de conservation (mois)</Label>
                <Input type="number" min={1} max={240} value={policy.retentionMonths} disabled={!canWrite}
                  onChange={(e) => setPolicy((p) => ({ ...p, retentionMonths: Number(e.target.value) }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Mentions affichées</CardTitle>
            <CardDescription>Reprises en pied de vos emails et sur vos landing pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Mention légale en pied d’email</Label>
              <Textarea rows={3} value={policy.legalNotice} disabled={!canWrite}
                onChange={(e) => setPolicy((p) => ({ ...p, legalNotice: e.target.value }))}
                placeholder="Vous recevez cet email car… Raison sociale, adresse, numéro ORIAS…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>URL de la politique de confidentialité</Label>
                <Input value={policy.privacyUrl} disabled={!canWrite}
                  onChange={(e) => setPolicy((p) => ({ ...p, privacyUrl: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact données personnelles</Label>
                <Input type="email" value={policy.dpoEmail} disabled={!canWrite}
                  onChange={(e) => setPolicy((p) => ({ ...p, dpoEmail: e.target.value }))} />
              </div>
            </div>
            {canWrite ? (
              <Button
                loading={busy === 'policy'}
                onClick={async () => {
                  setBusy('policy');
                  const r = await updateCompliancePolicyAction(policy);
                  setBusy(null);
                  if (r.ok) { toast.success('Politique enregistrée'); router.refresh(); } else toast.error(r.error);
                }}
              >
                Enregistrer la politique
              </Button>
            ) : null}
            <p className="rounded-md border border-warning/30 bg-warning/5 p-2.5 text-[10px] leading-relaxed text-warning">
              ASSURLEAD AI fournit des outils de traçabilité (consentement, provenance, suppression, audit).
              Il ne constitue pas un avis juridique et ne garantit pas la conformité de vos envois : il vous
              appartient de vérifier que vous êtes en droit de contacter chaque personne.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Objectifs ── */}
      <TabsContent value="goals">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Objectif quotidien de leads qualifiés</CardTitle>
            <CardDescription>
              Utilisé par le tableau de bord pour mesurer votre avancement et estimer le volume d’envoi nécessaire.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Objectif minimum / jour</Label>
                <Input type="number" min={1} value={goal.minTarget} disabled={!canWrite}
                  onChange={(e) => setGoal((g) => ({ ...g, minTarget: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Objectif ambitieux / jour</Label>
                <Input type="number" min={1} value={goal.stretchTarget} disabled={!canWrite}
                  onChange={(e) => setGoal((g) => ({ ...g, stretchTarget: Number(e.target.value) }))} />
              </div>
            </div>
            {canWrite ? (
              <Button
                loading={busy === 'goal'}
                onClick={async () => {
                  setBusy('goal');
                  const r = await updateDailyGoalAction(goal.minTarget, goal.stretchTarget);
                  setBusy(null);
                  if (r.ok) { toast.success('Objectifs enregistrés'); router.refresh(); } else toast.error(r.error);
                }}
              >
                Enregistrer les objectifs
              </Button>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Un lead est considéré comme qualifié à partir d’un score de 60/100. Le détail du calcul est
              affiché sur chaque fiche de lead.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Produits ── */}
      <TabsContent value="products">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Produits d’assurance proposés</CardTitle>
            <CardDescription>Les produits actifs sont mis en avant dans les campagnes et les formulaires.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {INSURANCE_TYPES.map((type) => {
                const active = activeProducts.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!canWrite}
                    onClick={() => setActiveProducts((p) => (active ? p.filter((x) => x !== type) : [...p, type]))}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
                      active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                    )}
                  >
                    {insuranceLabel(type)}
                  </button>
                );
              })}
            </div>
            {canWrite ? (
              <Button
                loading={busy === 'products'}
                onClick={async () => {
                  setBusy('products');
                  const r = await updateProductsAction(activeProducts);
                  setBusy(null);
                  if (r.ok) { toast.success('Produits mis à jour'); router.refresh(); } else toast.error(r.error);
                }}
              >
                Enregistrer
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Équipe ── */}
      <TabsContent value="team" className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Membres de l’équipe</CardTitle>
              <CardDescription>Chaque rôle donne accès à un périmètre différent.</CardDescription>
            </div>
            {canManageMembers ? <Button size="sm" onClick={() => setInviteOpen(true)}><Plus /> Ajouter</Button> : null}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  {canManageMembers ? <TableHead className="w-10"></TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <span className="block font-medium">{member.name}</span>
                      <span className="block text-xs text-muted-foreground">{member.email}</span>
                    </TableCell>
                    <TableCell>
                      {canManageMembers && member.userId !== currentUserId ? (
                        <Select
                          value={member.role}
                          onValueChange={async (v) => {
                            const r = await updateMemberRoleAction(member.userId, v as Role);
                            if (r.ok) { toast.success('Rôle mis à jour'); router.refresh(); } else toast.error(r.error);
                          }}
                        >
                          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES.filter((r) => r !== 'OWNER' || currentRole === 'OWNER').map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r].fr}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{ROLE_LABELS[member.role].fr}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString('fr-FR') : 'jamais'}
                    </TableCell>
                    {canManageMembers ? (
                      <TableCell>
                        {member.userId !== currentUserId ? (
                          <Button size="icon-sm" variant="ghost" aria-label="Retirer"
                            onClick={() => setRemoving({ userId: member.userId, name: member.name })}>
                            <Trash2 className="text-destructive" />
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Permissions par rôle</CardTitle>
            <CardDescription>Les permissions sont vérifiées côté serveur à chaque action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {ROLES.map((role) => (
              <div key={role} className="rounded-lg border p-2.5">
                <p className="font-semibold">{ROLE_LABELS[role].fr}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {ROLE_PERMISSIONS[role].length} permission(s) — {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Consommation ── */}
      <TabsContent value="usage">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Consommation du mois</CardTitle>
            <CardDescription>Suivi des appels externes facturables, pour éviter les dérives de coût.</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune consommation enregistrée ce mois-ci.</p>
            ) : (
              <dl className="grid gap-2 sm:grid-cols-3">
                {usage.map((u) => (
                  <div key={u.kind} className="rounded-lg border p-3">
                    <dt className="text-[11px] text-muted-foreground">{USAGE_LABELS[u.kind] ?? u.kind}</dt>
                    <dd className="num text-xl font-semibold">{u.quantity.toLocaleString('fr-FR')}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Un plafond mensuel de requêtes IA protège contre les boucles accidentelles
              (variable <code className="rounded bg-muted px-1">AI_MONTHLY_REQUEST_CAP</code>).
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Audit ── */}
      {canReadAudit ? (
        <TabsContent value="audit">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Journal d’audit</CardTitle>
              <CardDescription>100 derniers événements : imports, lancements, consentements, suppressions, accès.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Détail</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="muted">{log.action}</Badge></TableCell>
                      <TableCell className="max-w-md truncate text-xs">{log.summary}</TableCell>
                      <TableCell className="text-xs">{log.userName}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Créez le compte et communiquez le mot de passe initial à la personne concernée, qui pourra le modifier ensuite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={invite.name} onChange={(e) => setInvite((i) => ({ ...i, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={invite.email} onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={invite.role} onValueChange={(v) => setInvite((i) => ({ ...i, role: v as Role }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.filter((r) => r !== 'OWNER' || currentRole === 'OWNER').map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r].fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe initial (8 caractères minimum) *</Label>
              <Input type="text" value={invite.password} onChange={(e) => setInvite((i) => ({ ...i, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button
              loading={busy === 'invite'}
              onClick={async () => {
                setBusy('invite');
                const r = await inviteMemberAction(invite);
                setBusy(null);
                if (r.ok) {
                  toast.success(`${r.data.email} ajouté à l’équipe`);
                  setInviteOpen(false);
                  setInvite({ email: '', name: '', role: 'SALES', password: '' });
                  router.refresh();
                } else toast.error(r.error);
              }}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => { if (!v) setRemoving(null); }}
        title={`Retirer ${removing?.name} de l’espace ?`}
        description="La personne perd immédiatement l’accès. Ses leads et son historique sont conservés."
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const r = await removeMemberAction(removing.userId);
          if (r.ok) { toast.success('Membre retiré'); router.refresh(); } else toast.error(r.error);
        }}
      />

      <ConfirmDialog
        open={purging}
        onOpenChange={setPurging}
        title="Supprimer toutes les données de démonstration ?"
        description="Les contacts, campagnes, landing pages, leads et tâches marqués DÉMO seront définitivement supprimés. Vos données réelles ne sont pas affectées."
        destructive
        requireTyping="SUPPRIMER"
        confirmLabel="Supprimer les données démo"
        onConfirm={async () => {
          const r = await purgeDemoDataAction();
          if (r.ok) { toast.success(`${r.data.deleted} enregistrement(s) supprimé(s)`); router.refresh(); } else toast.error(r.error);
        }}
      />
    </Tabs>
  );
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: 'accès complet, y compris la gestion de l’espace de travail',
  ADMIN: 'campagnes, contacts, leads, paramètres et intégrations',
  MARKETING: 'contacts, segments, campagnes, landing pages et analytics',
  SALES: 'leads qualifiés, CRM, tâches et notes',
  VIEWER: 'lecture seule des analyses et des données',
};

const USAGE_LABELS: Record<string, string> = {
  EMAIL_SEND: 'Emails envoyés', VERIFICATION: 'Vérifications d’adresses',
  AI_REQUEST: 'Requêtes IA', AI_TOKENS: 'Jetons IA', SMS: 'SMS', STORAGE: 'Stockage',
};

function PolicyToggle({
  label, help, checked, disabled, onChange,
}: {
  label: string; help?: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        {help ? <p className="mt-0.5 text-[10px] text-muted-foreground">{help}</p> : null}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
