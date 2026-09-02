'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, Smartphone, Monitor, ArrowUp, ArrowDown, EyeOff, Globe, Save,
  Plus, Trash2, GripVertical, Palette, Search, FormInput,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LandingRenderer } from '@/components/landing/landing-renderer';
import { FormBuilder, type EditableForm } from './form-builder';
import { updateLandingPageAction, publishLandingPageAction } from '@/server/actions/landing-pages';
import type { LandingSection, LandingTheme } from '@/server/services/landing-templates';
import { cn } from '@/lib/utils';

type EditablePage = {
  id: string; name: string; slug: string; status: string;
  seoTitle: string; seoDescription: string; noIndex: boolean; customDomain: string | null;
  sections: LandingSection[]; theme: LandingTheme;
};

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero (titre principal)', benefits: 'Bénéfices', trust: 'Preuves / engagements',
  steps: 'Comment ça marche', form: 'Formulaire', faq: 'Questions fréquentes',
  legal: 'Mentions légales', footer: 'Pied de page',
};

const ACCENTS = ['#1d4ed8', '#0f766e', '#b91c1c', '#7c3aed', '#c2410c', '#0369a1', '#15803d', '#111827'];

export function LandingEditor({
  page: initialPage, form: initialForm, companyName, logoUrl, canWrite, appUrl,
}: {
  page: EditablePage;
  form: EditableForm | null;
  companyName: string;
  logoUrl: string | null;
  canWrite: boolean;
  appUrl: string;
}) {
  const router = useRouter();
  const [page, setPage] = React.useState(initialPage);
  const [form, setForm] = React.useState(initialForm);
  const [device, setDevice] = React.useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = React.useState(false);

  const setSection = (index: number, next: LandingSection) =>
    setPage((p) => ({ ...p, sections: p.sections.map((s, i) => (i === index ? next : s)) }));

  const move = (index: number, delta: number) => {
    setPage((p) => {
      const next = [...p.sections];
      const target = index + delta;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...p, sections: next };
    });
  };

  const save = async () => {
    setSaving(true);
    const result = await updateLandingPageAction(page.id, {
      name: page.name, slug: page.slug, seoTitle: page.seoTitle, seoDescription: page.seoDescription,
      noIndex: page.noIndex, customDomain: page.customDomain,
      sections: page.sections as unknown as Record<string, unknown>[],
      theme: page.theme as unknown as Record<string, unknown>,
    });
    setSaving(false);
    if (result.ok) { toast.success('Page enregistrée'); router.refresh(); }
    else toast.error(result.error);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-4">
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} loading={saving}><Save /> Enregistrer</Button>
            <Button
              variant={page.status === 'PUBLISHED' ? 'outline' : 'success'}
              onClick={async () => {
                const publish = page.status !== 'PUBLISHED';
                const r = await publishLandingPageAction(page.id, publish);
                if (r.ok) {
                  setPage((p) => ({ ...p, status: publish ? 'PUBLISHED' : 'DRAFT' }));
                  toast.success(publish ? `Page publiée : ${r.data.url}` : 'Page dépubliée');
                  router.refresh();
                } else toast.error(r.error);
              }}
            >
              {page.status === 'PUBLISHED' ? <><EyeOff /> Dépublier</> : <><Globe /> Publier</>}
            </Button>
          </div>
        ) : null}

        <Tabs defaultValue="sections">
          <TabsList className="w-full">
            <TabsTrigger value="sections" className="flex-1"><Eye /> Sections</TabsTrigger>
            <TabsTrigger value="form" className="flex-1"><FormInput /> Formulaire</TabsTrigger>
            <TabsTrigger value="style" className="flex-1"><Palette /> Style</TabsTrigger>
            <TabsTrigger value="seo" className="flex-1"><Search /> SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-2">
            {page.sections.map((section, index) => (
              <Card key={section.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0 p-3">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    {SECTION_LABELS[section.type] ?? section.type}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button size="icon-sm" variant="ghost" disabled={!canWrite || index === 0} onClick={() => move(index, -1)} aria-label="Monter"><ArrowUp /></Button>
                    <Button size="icon-sm" variant="ghost" disabled={!canWrite || index === page.sections.length - 1} onClick={() => move(index, 1)} aria-label="Descendre"><ArrowDown /></Button>
                    <Switch
                      checked={section.visible !== false}
                      disabled={!canWrite}
                      onCheckedChange={(v) => setSection(index, { ...section, visible: v })}
                      aria-label="Afficher la section"
                    />
                  </div>
                </CardHeader>
                {section.visible !== false ? (
                  <CardContent className="space-y-2 p-3 pt-0">
                    <SectionEditor section={section} disabled={!canWrite} onChange={(next) => setSection(index, next)} />
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="form">
            {form ? (
              <FormBuilder form={form} onChange={setForm} disabled={!canWrite} />
            ) : (
              <Card><CardContent className="py-8 text-center text-xs text-muted-foreground">Aucun formulaire rattaché à cette page.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="style" className="space-y-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle>Apparence</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Couleur d’accentuation</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCENTS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        disabled={!canWrite}
                        onClick={() => setPage((p) => ({ ...p, theme: { ...p.theme, accent: color } }))}
                        className={cn('h-7 w-7 rounded-md border-2', page.theme.accent === color ? 'border-foreground' : 'border-transparent')}
                        style={{ background: color }}
                        aria-label={`Couleur ${color}`}
                      />
                    ))}
                    <Input
                      type="color"
                      className="h-7 w-12 p-0.5"
                      disabled={!canWrite}
                      value={page.theme.accent}
                      onChange={(e) => setPage((p) => ({ ...p, theme: { ...p.theme, accent: e.target.value } }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fond de page</Label>
                  <Input type="color" className="h-8 w-20 p-0.5" disabled={!canWrite}
                    value={page.theme.background}
                    onChange={(e) => setPage((p) => ({ ...p, theme: { ...p.theme, background: e.target.value } }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Arrondi des blocs</Label>
                  <Select value={page.theme.radius} disabled={!canWrite}
                    onValueChange={(v) => setPage((p) => ({ ...p, theme: { ...p.theme, radius: v as 'lg' } }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Léger</SelectItem>
                      <SelectItem value="md">Moyen</SelectItem>
                      <SelectItem value="lg">Prononcé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Adresse et référencement</CardTitle>
                <CardDescription>Contrôlez l’URL publique et l’indexation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nom interne</Label>
                  <Input value={page.name} disabled={!canWrite} onChange={(e) => setPage((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse (slug)</Label>
                  <Input value={page.slug} disabled={!canWrite} onChange={(e) => setPage((p) => ({ ...p, slug: e.target.value }))} />
                  <p className="break-all text-[10px] text-muted-foreground">{appUrl}/p/{page.slug}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Domaine personnalisé (facultatif)</Label>
                  <Input
                    value={page.customDomain ?? ''}
                    disabled={!canWrite}
                    placeholder="devis.votredomaine.fr"
                    onChange={(e) => setPage((p) => ({ ...p, customDomain: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Faites pointer un CNAME vers cette application, puis renseignez le domaine ici.
                    Consultez la section « Domaines » du README pour la configuration DNS.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Titre SEO</Label>
                  <Input value={page.seoTitle} disabled={!canWrite} onChange={(e) => setPage((p) => ({ ...p, seoTitle: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description SEO</Label>
                  <Textarea rows={2} value={page.seoDescription} disabled={!canWrite}
                    onChange={(e) => setPage((p) => ({ ...p, seoDescription: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-xs font-medium">Empêcher l’indexation par les moteurs</p>
                    <p className="text-[10px] text-muted-foreground">Recommandé pour les pages de campagne dédiées.</p>
                  </div>
                  <Switch checked={page.noIndex} disabled={!canWrite} onCheckedChange={(v) => setPage((p) => ({ ...p, noIndex: v }))} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Aperçu en direct</p>
          <div className="flex gap-1">
            <Button size="icon-sm" variant={device === 'desktop' ? 'secondary' : 'ghost'} onClick={() => setDevice('desktop')} aria-label="Bureau"><Monitor /></Button>
            <Button size="icon-sm" variant={device === 'mobile' ? 'secondary' : 'ghost'} onClick={() => setDevice('mobile')} aria-label="Mobile"><Smartphone /></Button>
          </div>
        </div>
        <div className={cn('overflow-hidden rounded-xl border bg-white transition-all', device === 'mobile' ? 'mx-auto w-[390px]' : 'w-full')}>
          <div className="max-h-[75vh] overflow-y-auto">
            {form ? (
              <LandingRenderer
                sections={page.sections}
                theme={page.theme}
                companyName={companyName}
                logoUrl={logoUrl}
                form={{
                  id: form.id, multiStep: form.multiStep, steps: form.steps,
                  consentText: form.consentText, successMessage: form.successMessage,
                  fields: form.fields.map((f) => ({ ...f, id: f.id ?? f.key })),
                }}
                landingPageId={page.id}
                recipientToken={null}
                preview
              />
            ) : null}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Aperçu interactif : la soumission du formulaire est simulée et ne crée aucun lead.
        </p>
      </div>
    </div>
  );
}

function SectionEditor({ section, disabled, onChange }: { section: LandingSection; disabled: boolean; onChange: (s: LandingSection) => void }) {
  if (section.type === 'hero') {
    return (
      <div className="space-y-2">
        <Field label="Sur-titre"><Input value={section.eyebrow ?? ''} disabled={disabled} onChange={(e) => onChange({ ...section, eyebrow: e.target.value })} /></Field>
        <Field label="Titre principal"><Textarea rows={2} value={section.headline} disabled={disabled} onChange={(e) => onChange({ ...section, headline: e.target.value })} /></Field>
        <Field label="Sous-titre"><Textarea rows={3} value={section.subheadline} disabled={disabled} onChange={(e) => onChange({ ...section, subheadline: e.target.value })} /></Field>
        <Field label="Libellé du bouton"><Input value={section.ctaLabel} disabled={disabled} onChange={(e) => onChange({ ...section, ctaLabel: e.target.value })} /></Field>
        <Field label="Image (URL, facultatif)"><Input value={section.imageUrl ?? ''} disabled={disabled} onChange={(e) => onChange({ ...section, imageUrl: e.target.value })} /></Field>
      </div>
    );
  }

  if (section.type === 'benefits' || section.type === 'steps') {
    return (
      <div className="space-y-2">
        <Field label="Titre de la section"><Input value={section.title} disabled={disabled} onChange={(e) => onChange({ ...section, title: e.target.value })} /></Field>
        {section.items.map((item, i) => (
          <div key={i} className="space-y-1.5 rounded-md border p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">Élément {i + 1}</span>
              <Button size="icon-sm" variant="ghost" disabled={disabled}
                onClick={() => onChange({ ...section, items: section.items.filter((_, j) => j !== i) })} aria-label="Retirer">
                <Trash2 className="text-destructive" />
              </Button>
            </div>
            <Input value={item.title} disabled={disabled} placeholder="Titre"
              onChange={(e) => onChange({ ...section, items: section.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <Textarea rows={2} value={item.body} disabled={disabled} placeholder="Description"
              onChange={(e) => onChange({ ...section, items: section.items.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
          </div>
        ))}
        <Button size="sm" variant="outline" disabled={disabled}
          onClick={() => onChange({ ...section, items: [...section.items, { title: '', body: '' }] })}>
          <Plus /> Ajouter un élément
        </Button>
      </div>
    );
  }

  if (section.type === 'trust') {
    return (
      <div className="space-y-2">
        <Field label="Titre de la section"><Input value={section.title} disabled={disabled} onChange={(e) => onChange({ ...section, title: e.target.value })} /></Field>
        {section.items.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <Input value={item} disabled={disabled}
              onChange={(e) => onChange({ ...section, items: section.items.map((x, j) => (j === i ? e.target.value : x)) })} />
            <Button size="icon-sm" variant="ghost" disabled={disabled}
              onClick={() => onChange({ ...section, items: section.items.filter((_, j) => j !== i) })} aria-label="Retirer">
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" disabled={disabled}
          onClick={() => onChange({ ...section, items: [...section.items, ''] })}><Plus /> Ajouter</Button>
      </div>
    );
  }

  if (section.type === 'faq') {
    return (
      <div className="space-y-2">
        <Field label="Titre"><Input value={section.title} disabled={disabled} onChange={(e) => onChange({ ...section, title: e.target.value })} /></Field>
        {section.items.map((item, i) => (
          <div key={i} className="space-y-1.5 rounded-md border p-2">
            <Input value={item.question} disabled={disabled} placeholder="Question"
              onChange={(e) => onChange({ ...section, items: section.items.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} />
            <Textarea rows={2} value={item.answer} disabled={disabled} placeholder="Réponse"
              onChange={(e) => onChange({ ...section, items: section.items.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })} />
          </div>
        ))}
        <Button size="sm" variant="outline" disabled={disabled}
          onClick={() => onChange({ ...section, items: [...section.items, { question: '', answer: '' }] })}><Plus /> Ajouter</Button>
      </div>
    );
  }

  if (section.type === 'form') {
    return (
      <div className="space-y-2">
        <Field label="Titre au-dessus du formulaire"><Input value={section.title} disabled={disabled} onChange={(e) => onChange({ ...section, title: e.target.value })} /></Field>
        <Field label="Texte d’accroche"><Input value={section.description} disabled={disabled} onChange={(e) => onChange({ ...section, description: e.target.value })} /></Field>
      </div>
    );
  }

  return (
    <Field label="Texte">
      <Textarea rows={4} value={(section as { body: string }).body} disabled={disabled}
        onChange={(e) => onChange({ ...section, body: e.target.value } as LandingSection)} />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      {children}
    </div>
  );
}
