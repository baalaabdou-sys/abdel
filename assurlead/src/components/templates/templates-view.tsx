'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Copy, Archive, Trash2, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { INSURANCE_TYPES, insuranceLabel } from '@/lib/domain';
import { archiveTemplateAction, deleteTemplateAction, duplicateTemplateAction, saveTemplateAction } from '@/server/actions/templates';
import type { InsuranceType } from '@prisma/client';

type Template = {
  id: string; name: string; category: string; product: InsuranceType; locale: string;
  subject: string; previewText: string; bodyText: string;
  version: number; archived: boolean; isDemo: boolean; updatedAt: string;
};

const CATEGORIES = [
  'Assurance Auto', 'Mutuelle', 'Habitation', 'Moto', 'Prévoyance',
  'RC Pro', 'Relance', 'Renouvellement', 'Cross-sell', 'Autre',
];

const EMPTY = {
  name: '', category: 'Autre', product: 'AUTRE' as InsuranceType, locale: 'fr',
  subject: '', previewText: '',
  bodyText: 'Bonjour {{first_name}},\n\n[votre message]\n\n[[CTA]]\n\nBien cordialement,',
};

export function TemplatesView({ templates, canWrite }: { templates: Template[]; canWrite: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Template | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [preview, setPreview] = React.useState<Template | null>(null);
  const [deleting, setDeleting] = React.useState<Template | null>(null);
  const [category, setCategory] = React.useState('all');

  const filtered = templates.filter((t) => category === 'all' || t.category === category);
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {canWrite ? (
          <Button size="sm" className="ml-auto" onClick={() => { setCreating(true); setEditing(null); }}>
            <Plus /> Nouveau template
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun template"
          description="Enregistrez vos meilleurs emails comme modèles pour les réutiliser d’une campagne à l’autre."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className={template.archived ? 'opacity-60' : undefined}>
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div className="min-w-0">
                  <CardTitle className="truncate">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{template.subject}</CardDescription>
                </div>
                {canWrite ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions"><Pencil /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(template); setCreating(false); }}><Pencil /> Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPreview(template)}><Eye /> Aperçu</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const r = await duplicateTemplateAction(template.id);
                          if (r.ok) { toast.success('Template dupliqué'); router.refresh(); } else toast.error(r.error);
                        }}
                      ><Copy /> Dupliquer</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const r = await archiveTemplateAction(template.id, !template.archived);
                          if (r.ok) { toast.success(template.archived ? 'Template restauré' : 'Template archivé'); router.refresh(); }
                          else toast.error(r.error);
                        }}
                      ><Archive /> {template.archived ? 'Restaurer' : 'Archiver'}</DropdownMenuItem>
                      <DropdownMenuItem destructive onClick={() => setDeleting(template)}><Trash2 /> Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button variant="ghost" size="icon-sm" onClick={() => setPreview(template)} aria-label="Aperçu"><Eye /></Button>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{template.category}</Badge>
                  <Badge variant="muted">{insuranceLabel(template.product)}</Badge>
                  <Badge variant="muted">v{template.version}</Badge>
                  {template.archived ? <Badge variant="warning">Archivé</Badge> : null}
                  {template.isDemo ? <Badge variant="warning">Démo</Badge> : null}
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">{template.bodyText}</p>
                <p className="text-[10px] text-muted-foreground">
                  Modifié le {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog
        key={editing?.id ?? 'new'}
        open={creating || !!editing}
        template={editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
      />

      <Dialog open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.subject}</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">{preview?.bodyText}</pre>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => { if (!v) setDeleting(null); }}
        title="Supprimer ce template ?"
        description="Les campagnes créées à partir de ce template ne sont pas affectées."
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const r = await deleteTemplateAction(deleting.id);
          if (r.ok) { toast.success('Template supprimé'); router.refresh(); } else toast.error(r.error);
        }}
      />
    </div>
  );
}

function TemplateDialog({
  open, template, onOpenChange, onSaved,
}: {
  open: boolean; template: Template | null;
  onOpenChange: (v: boolean) => void; onSaved: () => void;
}) {
  const [values, setValues] = React.useState(template ?? EMPTY);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setValues(template ?? EMPTY), [template]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Modifier le template' : 'Nouveau template'}</DialogTitle>
          <DialogDescription>
            Variables disponibles : {'{{first_name}}'}, {'{{city}}'}, {'{{insurance_type}}'}, {'{{renewal_date}}'}, {'{{current_insurer}}'}.
            Placez [[CTA]] à l’endroit du bouton.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nom *</Label>
            <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Select value={values.category} onValueChange={(v) => setValues((s) => ({ ...s, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Produit</Label>
            <Select value={values.product} onValueChange={(v) => setValues((s) => ({ ...s, product: v as InsuranceType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INSURANCE_TYPES.map((t) => <SelectItem key={t} value={t}>{insuranceLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Objet *</Label>
            <Input value={values.subject} onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Texte de prévisualisation</Label>
            <Input value={values.previewText} onChange={(e) => setValues((v) => ({ ...v, previewText: e.target.value }))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Corps du message *</Label>
            <Textarea rows={12} className="font-mono text-xs" value={values.bodyText}
              onChange={(e) => setValues((v) => ({ ...v, bodyText: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              const r = await saveTemplateAction(template?.id ?? null, {
                name: values.name, category: values.category, product: values.product,
                locale: values.locale, subject: values.subject,
                previewText: values.previewText, bodyText: values.bodyText,
              });
              setSaving(false);
              if (r.ok) { toast.success('Template enregistré'); onSaved(); } else toast.error(r.error);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
