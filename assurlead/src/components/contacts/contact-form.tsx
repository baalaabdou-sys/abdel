'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createContactAction, updateContactAction } from '@/server/actions/contacts';
import { INSURANCE_TYPES, insuranceLabel } from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { InsuranceType } from '@prisma/client';

export type ContactFormValues = {
  email: string; firstName: string; lastName: string; phone: string; address: string;
  city: string; postalCode: string; country: string; birthDate: string; profession: string;
  company: string; status: string; insuranceInterests: InsuranceType[]; currentInsurer: string;
  renewalDate: string; requestedCoverage: string; budgetMin: string; budgetMax: string;
  notes: string; tags: string; source: string; sourceDetail: string; consentEmail: string;
  consentPhone: string; consentDate: string; consentSource: string; legalBasisNote: string;
  emailMarketingAllowed: boolean; phoneContactAllowed: boolean;
};

export const EMPTY_CONTACT: ContactFormValues = {
  email: '', firstName: '', lastName: '', phone: '', address: '', city: '', postalCode: '',
  country: 'FR', birthDate: '', profession: '', company: '', status: 'PROSPECT',
  insuranceInterests: [], currentInsurer: '', renewalDate: '', requestedCoverage: '',
  budgetMin: '', budgetMax: '', notes: '', tags: '', source: '', sourceDetail: '',
  consentEmail: 'UNKNOWN', consentPhone: 'UNKNOWN', consentDate: '', consentSource: '',
  legalBasisNote: '', emailMarketingAllowed: false, phoneContactAllowed: false,
};

export function ContactForm({ contactId, initial }: { contactId?: string; initial: ContactFormValues }) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const set = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors({});
    const payload = {
      ...values,
      budgetMin: values.budgetMin ? Number(values.budgetMin) : null,
      budgetMax: values.budgetMax ? Number(values.budgetMax) : null,
      tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
      birthDate: values.birthDate || null,
      renewalDate: values.renewalDate || null,
      consentDate: values.consentDate || null,
    };
    const result = contactId ? await updateContactAction(contactId, payload) : await createContactAction(payload);
    setSaving(false);
    if (result.ok) {
      toast.success(contactId ? 'Contact mis à jour' : 'Contact créé');
      router.push(`/contacts/${result.data.id}`);
      router.refresh();
    } else {
      if (result.fieldErrors) setErrors(result.fieldErrors);
      toast.error(result.error);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Card>
        <CardHeader className="pb-3"><CardTitle>Identité et coordonnées</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Email *" error={errors.email?.[0]}>
            <Input type="email" required value={values.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <Input value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="06 12 34 56 78" />
          </Field>
          <Field label="Prénom"><Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Nom"><Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
          <Field label="Adresse" className="sm:col-span-2"><Input value={values.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Code postal"><Input value={values.postalCode} onChange={(e) => set('postalCode', e.target.value)} /></Field>
          <Field label="Ville"><Input value={values.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Date de naissance" help="Stockée uniquement si utile à la qualification du besoin.">
            <Input type="date" value={values.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
          </Field>
          <Field label="Profession"><Input value={values.profession} onChange={(e) => set('profession', e.target.value)} /></Field>
          <Field label="Entreprise"><Input value={values.company} onChange={(e) => set('company', e.target.value)} /></Field>
          <Field label="Statut">
            <Select value={values.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="CUSTOMER">Client</SelectItem>
                <SelectItem value="FORMER_CUSTOMER">Ancien client</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Besoins assurance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="mb-1.5 block">Produits d’intérêt</Label>
            <div className="flex flex-wrap gap-1.5">
              {INSURANCE_TYPES.map((t) => {
                const active = values.insuranceInterests.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('insuranceInterests', active ? values.insuranceInterests.filter((x) => x !== t) : [...values.insuranceInterests, t])}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                    )}
                  >
                    {insuranceLabel(t)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Assureur actuel"><Input value={values.currentInsurer} onChange={(e) => set('currentInsurer', e.target.value)} /></Field>
            <Field label="Date d’échéance"><Input type="date" value={values.renewalDate} onChange={(e) => set('renewalDate', e.target.value)} /></Field>
            <Field label="Garanties demandées" className="sm:col-span-2"><Input value={values.requestedCoverage} onChange={(e) => set('requestedCoverage', e.target.value)} /></Field>
            <Field label="Budget minimum (€)"><Input type="number" value={values.budgetMin} onChange={(e) => set('budgetMin', e.target.value)} /></Field>
            <Field label="Budget maximum (€)"><Input type="number" value={values.budgetMax} onChange={(e) => set('budgetMax', e.target.value)} /></Field>
            <Field label="Tags (séparés par des virgules)" className="sm:col-span-2"><Input value={values.tags} onChange={(e) => set('tags', e.target.value)} /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={3} value={values.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Provenance et consentement</CardTitle>
          <CardDescription>
            Le consentement n’est jamais déduit automatiquement. Renseignez uniquement ce que vous
            pouvez justifier.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Source"><Input value={values.source} onChange={(e) => set('source', e.target.value)} placeholder="Formulaire site, salon…" /></Field>
          <Field label="Détail de la source"><Input value={values.sourceDetail} onChange={(e) => set('sourceDetail', e.target.value)} /></Field>
          <Field label="Consentement email">
            <Select value={values.consentEmail} onValueChange={(v) => set('consentEmail', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UNKNOWN">Inconnu</SelectItem>
                <SelectItem value="GRANTED">Accordé</SelectItem>
                <SelectItem value="DENIED">Refusé</SelectItem>
                <SelectItem value="WITHDRAWN">Retiré</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Consentement téléphone">
            <Select value={values.consentPhone} onValueChange={(v) => set('consentPhone', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UNKNOWN">Inconnu</SelectItem>
                <SelectItem value="GRANTED">Accordé</SelectItem>
                <SelectItem value="DENIED">Refusé</SelectItem>
                <SelectItem value="WITHDRAWN">Retiré</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date de consentement"><Input type="date" value={values.consentDate} onChange={(e) => set('consentDate', e.target.value)} /></Field>
          <Field label="Origine du consentement"><Input value={values.consentSource} onChange={(e) => set('consentSource', e.target.value)} /></Field>
          <Field label="Note de base légale / conformité" className="sm:col-span-2">
            <Input value={values.legalBasisNote} onChange={(e) => set('legalBasisNote', e.target.value)} />
          </Field>
          <div className="sm:col-span-2 space-y-2.5 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium">Marketing email autorisé</p>
                <p className="text-[10px] text-muted-foreground">Requis pour inclure ce contact dans une campagne.</p>
              </div>
              <Switch checked={values.emailMarketingAllowed} onCheckedChange={(v) => set('emailMarketingAllowed', v)} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium">Contact téléphonique autorisé</p>
                <p className="text-[10px] text-muted-foreground">Utilisé par l’équipe commerciale.</p>
              </div>
              <Switch checked={values.phoneContactAllowed} onCheckedChange={(v) => set('phoneContactAllowed', v)} />
            </div>
          </div>
          {values.consentEmail === 'UNKNOWN' && values.emailMarketingAllowed ? (
            <Badge variant="warning" className="sm:col-span-2">
              Le consentement est « inconnu » mais le marketing email est autorisé : vérifiez que cela
              correspond à votre politique.
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        <Button type="submit" loading={saving}>{contactId ? 'Enregistrer' : 'Créer le contact'}</Button>
      </div>
    </form>
  );
}

function Field({ label, children, help, error, className }: { label: string; children: React.ReactNode; help?: string; error?: string; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      {children}
      {help ? <p className="text-[10px] text-muted-foreground">{help}</p> : null}
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
