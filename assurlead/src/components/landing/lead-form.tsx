'use client';
import * as React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { recordFormStartAction, recordFormStepAction, submitFormAction } from '@/server/actions/funnel';

export type PublicFormField = {
  id: string; key: string; label: string; type: string; step: number; order: number;
  required: boolean; placeholder: string; helpText: string;
  options: { value: string; label: string }[];
  conditionField: string | null; conditionValue: string | null;
};

export type PublicFormDefinition = {
  id: string;
  multiStep: boolean;
  steps: { key: string; title: string; description: string }[];
  consentText: string;
  successMessage: string;
  fields: PublicFormField[];
};

export function LeadForm({
  form, landingPageId, recipientToken, accent, preview = false,
}: {
  form: PublicFormDefinition;
  landingPageId: string;
  recipientToken: string | null;
  accent: string;
  preview?: boolean;
}) {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [step, setStep] = React.useState(1);
  const [started, setStarted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState('');

  const maxStep = form.multiStep ? Math.max(1, ...form.fields.map((f) => f.step)) : 1;
  const stepMeta = form.steps[step - 1];

  const isVisible = React.useCallback(
    (field: PublicFormField) => {
      if (!field.conditionField) return true;
      const dependency = String(answers[field.conditionField] ?? '');
      return !field.conditionValue || dependency === field.conditionValue;
    },
    [answers],
  );

  const stepFields = form.fields
    .filter((f) => (form.multiStep ? f.step === step : true))
    .filter(isVisible)
    .sort((a, b) => a.step - b.step || a.order - b.order);

  const setValue = (key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (!started && !preview) {
      setStarted(true);
      void recordFormStartAction(landingPageId, recipientToken);
    }
  };

  const validateStep = () => {
    const next: Record<string, string> = {};
    for (const field of stepFields) {
      if (!field.required) continue;
      const value = answers[field.key];
      if (field.type === 'checkbox') {
        if (value !== true) next[field.key] = 'Cette case doit être cochée pour continuer.';
      } else if (value === undefined || value === null || String(value).trim() === '') {
        next[field.key] = 'Ce champ est obligatoire.';
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        next[field.key] = 'Adresse email invalide.';
      } else if (field.type === 'tel' && String(value).replace(/\D/g, '').length < 9) {
        next[field.key] = 'Numéro de téléphone incomplet.';
      } else if (field.type === 'postal' && !/^\d{5}$/.test(String(value).trim())) {
        next[field.key] = 'Code postal à 5 chiffres.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = () => {
    if (!validateStep()) return;
    if (!preview) void recordFormStepAction(landingPageId, step);
    setStep((s) => Math.min(s + 1, maxStep));
  };

  const onSubmit = async () => {
    if (!validateStep()) return;
    if (preview) {
      setDone('Aperçu : en production, cette demande créerait un lead qualifié.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    const result = await submitFormAction({
      formId: form.id,
      landingPageId,
      recipientToken,
      answers,
      consentGiven: true,
    });
    setSubmitting(false);
    if (result.ok) setDone(result.data.message);
    else setFormError(result.error);
  };

  if (done) {
    return (
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-emerald-900">Demande enregistrée</p>
        <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">{done}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {form.multiStep && maxStep > 1 ? (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>{stepMeta?.title ?? `Étape ${step}`}</span>
            <span>
              Étape {step} sur {maxStep}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / maxStep) * 100}%`, background: accent }}
            />
          </div>
          {stepMeta?.description ? <p className="mt-2 text-[12px] text-slate-500">{stepMeta.description}</p> : null}
        </div>
      ) : null}

      <div className="space-y-3.5">
        {stepFields.map((field) => (
          <Field key={field.id} field={field} value={answers[field.key]} error={errors[field.key]} accent={accent} onChange={(v) => setValue(field.key, v)} />
        ))}
      </div>

      {formError ? <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-[12px] text-red-700">{formError}</p> : null}

      <div className="mt-5 flex gap-2">
        {form.multiStep && step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Retour
          </button>
        ) : null}
        <button
          type="button"
          onClick={form.multiStep && step < maxStep ? onNext : onSubmit}
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: accent }}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {form.multiStep && step < maxStep ? 'Continuer' : 'Envoyer ma demande'}
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Vos informations sont utilisées pour traiter votre demande. Vous pouvez demander leur suppression à tout moment.
      </p>
    </div>
  );
}

function Field({
  field, value, error, accent, onChange,
}: {
  field: PublicFormField;
  value: unknown;
  error?: string;
  accent: string;
  onChange: (v: unknown) => void;
}) {
  const base =
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-slate-400 focus:ring-2';
  const borderClass = error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-slate-200';
  const id = `f-${field.key}`;

  if (field.type === 'checkbox') {
    return (
      <div>
        <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
            style={{ accentColor: accent }}
          />
          <span className="text-[12px] leading-relaxed text-slate-700">
            {field.label}
            {field.required ? ' *' : ''}
          </span>
        </label>
        {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-slate-800">
          {field.label}
          {field.required ? ' *' : ''}
        </legend>
        <div className="grid gap-2">
          {field.options.map((opt) => {
            const checked = value === opt.value;
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                style={{
                  borderColor: checked ? accent : '#cbd5e1',
                  background: checked ? `color-mix(in srgb, ${accent} 6%, white)` : 'white',
                }}
              >
                <input
                  type="radio"
                  name={field.key}
                  value={opt.value}
                  checked={checked}
                  onChange={() => onChange(opt.value)}
                  className="h-4 w-4"
                  style={{ accentColor: accent }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
        {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-800">
        {field.label}
        {field.required ? ' *' : ''}
      </label>
      {field.type === 'select' ? (
        <select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={`${base} ${borderClass}`}>
          <option value="">Sélectionnez…</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          id={id}
          rows={3}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} ${borderClass} resize-y`}
        />
      ) : (
        <input
          id={id}
          type={field.type === 'postal' ? 'text' : field.type}
          inputMode={field.type === 'postal' ? 'numeric' : field.type === 'tel' ? 'tel' : undefined}
          autoComplete={AUTOCOMPLETE[field.type] ?? 'off'}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} ${borderClass}`}
        />
      )}
      {field.helpText ? <p className="mt-1 text-[11px] text-slate-500">{field.helpText}</p> : null}
      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

const AUTOCOMPLETE: Record<string, string> = {
  email: 'email', tel: 'tel', postal: 'postal-code', text: 'off', date: 'off', number: 'off',
};
