'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createLandingPageAction } from '@/server/actions/landing-pages';
import { insuranceLabel } from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { InsuranceType } from '@prisma/client';

export function NewLandingPageButton({ templates }: { templates: { key: string; name: string; product: InsuranceType; description: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(params.get('new') === '1');
  const [name, setName] = React.useState('');
  const [templateKey, setTemplateKey] = React.useState(templates[0]?.key ?? 'general');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const product = params.get('product');
    if (product) {
      const match = templates.find((t) => t.product === product);
      if (match) { setTemplateKey(match.key); setName(match.name); }
    }
  }, [params, templates]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus /> Nouvelle landing page</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouvelle landing page</DialogTitle>
            <DialogDescription>Choisissez un modèle : sections et formulaire multi-étapes sont pré-configurés.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="lp-name">Nom de la page *</Label>
            <Input id="lp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Assurance Auto — Septembre" />
          </div>

          <div className="space-y-1.5">
            <Label>Modèle</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setTemplateKey(t.key); if (!name) setName(t.name); }}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    templateKey === t.key ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                  )}
                >
                  <span className="block text-sm font-medium">{insuranceLabel(t.product)}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{t.description}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              loading={saving}
              onClick={async () => {
                if (name.trim().length < 2) { toast.error('Donnez un nom à la page.'); return; }
                setSaving(true);
                const result = await createLandingPageAction({ name: name.trim(), templateKey });
                setSaving(false);
                if (result.ok) { toast.success('Landing page créée'); router.push(`/landing-pages/${result.data.id}`); }
                else toast.error(result.error);
              }}
            >
              Créer la page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
