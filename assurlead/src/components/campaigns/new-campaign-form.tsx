'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCampaignAction } from '@/server/actions/campaigns';
import { CAMPAIGN_OBJECTIVE_LIST, INSURANCE_TYPES, insuranceLabel, objectiveLabel } from '@/lib/domain';
import { cn } from '@/lib/utils';

export function NewCampaignForm({ defaultName, defaultProduct, defaultObjective }: { defaultName: string; defaultProduct: string; defaultObjective: string }) {
  const router = useRouter();
  const [name, setName] = React.useState(defaultName);
  const [objective, setObjective] = React.useState(defaultObjective);
  const [product, setProduct] = React.useState(defaultProduct);
  const [saving, setSaving] = React.useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Nom de la campagne</CardTitle>
          <CardDescription>Visible uniquement en interne.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-w-md">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Assurance Auto — Septembre" autoFocus />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Objectif de la campagne</CardTitle>
          <CardDescription>Détermine la structure du message et le formulaire recommandé.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPAIGN_OBJECTIVE_LIST.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setObjective(o)}
              className={cn(
                'rounded-lg border p-3 text-left text-sm transition-colors',
                objective === o ? 'border-primary bg-primary/5 font-medium text-primary' : 'hover:bg-accent',
              )}
            >
              {objectiveLabel(o)}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Produit d’assurance</CardTitle>
          <CardDescription>Utilisé pour la rédaction, la landing page et le scoring des leads.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {INSURANCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setProduct(t)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                product === t ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
              )}
            >
              {insuranceLabel(t)}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/campaigns')}>Annuler</Button>
        <Button
          loading={saving}
          onClick={async () => {
            if (name.trim().length < 2) { toast.error('Donnez un nom à la campagne.'); return; }
            setSaving(true);
            const result = await createCampaignAction({ name: name.trim(), objective, product });
            setSaving(false);
            if (result.ok) { toast.success('Campagne créée en brouillon'); router.push(`/campaigns/${result.data.id}`); }
            else toast.error(result.error);
          }}
        >
          Créer le brouillon
        </Button>
      </div>

      <p className="rounded-lg border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Créer une campagne ne déclenche aucun envoi. Vous configurerez ensuite l’audience, l’email,
        la landing page et l’expéditeur, puis vous devrez cliquer explicitement sur
        « Lancer la campagne ».
      </p>
    </div>
  );
}
