'use client';
import * as React from 'react';
import type { LandingSection, LandingTheme } from '@/server/services/landing-templates';
import { LeadForm, type PublicFormDefinition } from './lead-form';
import { Check, ShieldCheck } from 'lucide-react';

const RADIUS: Record<LandingTheme['radius'], string> = { sm: '6px', md: '10px', lg: '16px' };

export function LandingRenderer({
  sections, theme, companyName, logoUrl, privacyUrl, form, landingPageId, recipientToken, preview = false,
}: {
  sections: LandingSection[];
  theme: LandingTheme;
  companyName: string;
  logoUrl?: string | null;
  privacyUrl?: string;
  form: PublicFormDefinition;
  landingPageId: string;
  recipientToken: string | null;
  preview?: boolean;
}) {
  const visible = sections.filter((s) => s.visible !== false);
  const hero = visible.find((s) => s.type === 'hero') as Extract<LandingSection, { type: 'hero' }> | undefined;
  const formSection = visible.find((s) => s.type === 'form') as Extract<LandingSection, { type: 'form' }> | undefined;
  const formRef = React.useRef<HTMLDivElement>(null);

  const style = {
    '--accent': theme.accent,
    '--bg': theme.background,
    '--radius': RADIUS[theme.radius] ?? '16px',
  } as React.CSSProperties;

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={style} className="min-h-screen bg-[var(--bg)] text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-7 w-auto" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: 'var(--accent)' }}>
                <ShieldCheck className="h-4 w-4" />
              </span>
            )}
            <span className="text-sm font-semibold">{companyName}</span>
          </div>
          <button
            type="button"
            onClick={scrollToForm}
            className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', borderRadius: 'var(--radius)' }}
          >
            {hero?.ctaLabel ?? 'Demander mon étude'}
          </button>
        </div>
      </header>

      <main>
        {hero ? (
          <section className="mx-auto grid max-w-5xl gap-10 px-5 py-12 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <div>
              {hero.eyebrow ? (
                <span
                  className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ background: 'color-mix(in srgb, var(--accent) 12%, white)', color: 'var(--accent)' }}
                >
                  {hero.eyebrow}
                </span>
              ) : null}
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{hero.headline}</h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">{hero.subheadline}</p>
              <button
                type="button"
                onClick={scrollToForm}
                className="mt-6 inline-flex rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 lg:hidden"
                style={{ background: 'var(--accent)', borderRadius: 'var(--radius)' }}
              >
                {hero.ctaLabel}
              </button>
            </div>

            <div ref={formRef} className="lg:sticky lg:top-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ borderRadius: 'var(--radius)' }}>
                {formSection ? (
                  <>
                    <h2 className="text-lg font-semibold tracking-tight">{formSection.title}</h2>
                    <p className="mt-1 text-[13px] text-slate-600">{formSection.description}</p>
                  </>
                ) : null}
                <LeadForm
                  form={form}
                  landingPageId={landingPageId}
                  recipientToken={recipientToken}
                  accent={theme.accent}
                  preview={preview}
                />
              </div>
            </div>
          </section>
        ) : null}

        {visible.map((section) => {
          if (section.type === 'hero' || section.type === 'form') return null;

          if (section.type === 'benefits') {
            return (
              <section key={section.id} className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-5 py-12">
                  <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                  <div className="mt-6 grid gap-5 sm:grid-cols-3">
                    {section.items.map((item, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-4" style={{ borderRadius: 'var(--radius)' }}>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === 'steps') {
            return (
              <section key={section.id} className="border-t border-slate-200">
                <div className="mx-auto max-w-5xl px-5 py-12">
                  <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                  <ol className="mt-6 grid gap-5 sm:grid-cols-3">
                    {section.items.map((item, i) => (
                      <li key={i} className="relative pl-9">
                        <span
                          className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: 'var(--accent)' }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{item.body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            );
          }

          if (section.type === 'trust') {
            return (
              <section key={section.id} className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-5 py-12">
                  <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                  <ul className="mt-5 space-y-2.5">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          }

          if (section.type === 'faq') {
            return (
              <section key={section.id} className="border-t border-slate-200">
                <div className="mx-auto max-w-3xl px-5 py-12">
                  <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                  <dl className="mt-5 space-y-4">
                    {section.items.map((item, i) => (
                      <div key={i}>
                        <dt className="text-sm font-semibold">{item.question}</dt>
                        <dd className="mt-1 text-[13px] leading-relaxed text-slate-600">{item.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            );
          }

          if (section.type === 'legal' || section.type === 'footer') {
            return (
              <section key={section.id} className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-5 py-7">
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    {section.body}
                    {section.type === 'legal' && privacyUrl ? (
                      <>
                        {' '}
                        <a href={privacyUrl} className="underline" rel="noopener noreferrer" target="_blank">
                          Politique de confidentialité
                        </a>
                        .
                      </>
                    ) : null}
                  </p>
                </div>
              </section>
            );
          }
          return null;
        })}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-6 text-[11px] text-slate-500">
          © {new Date().getFullYear()} {companyName}. Toutes les demandes sont étudiées par un conseiller.
        </div>
      </footer>
    </div>
  );
}
