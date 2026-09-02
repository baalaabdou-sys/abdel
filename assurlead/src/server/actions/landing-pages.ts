'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { requireWorkspace, guard, ok, fail, writeAudit, type ActionResult } from '../context';
import { DEFAULT_THEME, LANDING_TEMPLATES, templateFor } from '../services/landing-templates';
import { INSURANCE_TYPES } from '@/lib/domain';

async function uniqueSlug(workspaceId: string, base: string): Promise<string> {
  let slug = slugify(base);
  let i = 1;
  for (;;) {
    const clash = await prisma.landingPage.findUnique({ where: { workspaceId_slug: { workspaceId, slug } } });
    if (!clash) return slug;
    slug = `${slugify(base)}-${++i}`;
  }
}

export async function createLandingPageAction(params: { name: string; templateKey: string; product?: string }): Promise<ActionResult<{ id: string; slug: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('landing:write');
    const parsed = z.object({
      name: z.string().min(2).max(120),
      templateKey: z.string().min(1),
      product: z.enum(INSURANCE_TYPES as [string, ...string[]]).optional(),
    }).safeParse(params);
    if (!parsed.success) return fail('Champs invalides');

    const template = templateFor(parsed.data.templateKey);
    const product = (parsed.data.product ?? template.product) as 'AUTO';
    const slug = await uniqueSlug(ctx.workspaceId, parsed.data.name);

    const form = await prisma.form.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: `Formulaire — ${parsed.data.name}`,
        product,
        multiStep: template.formSteps.length > 1,
        steps: template.formSteps as never,
        consentText: template.consentText,
        successMessage: 'Merci ! Votre demande est bien enregistrée. Un conseiller vous recontacte rapidement.',
        fields: {
          create: template.formFields.map((f) => ({
            key: f.key, label: f.label, type: f.type, step: f.step, order: f.order,
            required: f.required, options: (f.options ?? []) as never,
            placeholder: f.placeholder ?? '', helpText: f.helpText ?? '',
            conditionField: f.conditionField ?? null, conditionValue: f.conditionValue ?? null,
          })),
        },
      },
    });

    const page = await prisma.landingPage.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: parsed.data.name,
        slug,
        product,
        status: 'DRAFT',
        sections: template.sections as never,
        theme: DEFAULT_THEME as never,
        formId: form.id,
        seoTitle: parsed.data.name,
        seoDescription: template.description,
      },
    });

    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'landing.create',
      entityType: 'LandingPage', entityId: page.id, summary: `${page.name} (/${page.slug})`,
    });
    revalidatePath('/landing-pages');
    return ok({ id: page.id, slug: page.slug });
  });
}

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(80).optional(),
  seoTitle: z.string().max(160).optional(),
  seoDescription: z.string().max(300).optional(),
  noIndex: z.boolean().optional(),
  customDomain: z.string().max(160).optional().nullable(),
  sections: z.array(z.record(z.unknown())).optional(),
  theme: z.record(z.unknown()).optional(),
});

export async function updateLandingPageAction(id: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('landing:write');
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) return fail('Champs invalides');

    const page = await prisma.landingPage.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!page) return fail('Landing page introuvable');

    let slug = page.slug;
    if (parsed.data.slug && slugify(parsed.data.slug) !== page.slug) {
      slug = await uniqueSlug(ctx.workspaceId, parsed.data.slug);
    }

    // Snapshot the previous content so a published page can always be restored.
    if (parsed.data.sections) {
      const lastVersion = await prisma.landingPageVersion.findFirst({
        where: { landingPageId: id }, orderBy: { version: 'desc' }, select: { version: true },
      });
      await prisma.landingPageVersion.create({
        data: {
          landingPageId: id,
          version: (lastVersion?.version ?? 0) + 1,
          sections: page.sections as never,
          theme: page.theme as never,
          createdById: ctx.user.id,
        },
      });
    }

    await prisma.landingPage.update({
      where: { id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        slug,
        ...(parsed.data.seoTitle !== undefined ? { seoTitle: parsed.data.seoTitle } : {}),
        ...(parsed.data.seoDescription !== undefined ? { seoDescription: parsed.data.seoDescription } : {}),
        ...(parsed.data.noIndex !== undefined ? { noIndex: parsed.data.noIndex } : {}),
        ...(parsed.data.customDomain !== undefined ? { customDomain: parsed.data.customDomain || null } : {}),
        ...(parsed.data.sections ? { sections: parsed.data.sections as never } : {}),
        ...(parsed.data.theme ? { theme: parsed.data.theme as never } : {}),
      },
    });
    revalidatePath('/landing-pages');
    revalidatePath(`/landing-pages/${id}`);
    revalidatePath(`/p/${slug}`);
    return ok({ id });
  });
}

export async function publishLandingPageAction(id: string, publish: boolean): Promise<ActionResult<{ url: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('landing:write');
    const page = await prisma.landingPage.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
      include: { form: { include: { fields: true } } },
    });
    if (!page) return fail('Landing page introuvable');
    if (publish && (!page.form || page.form.fields.length < 2)) {
      return fail('Ajoutez au moins deux champs au formulaire avant de publier.');
    }

    await prisma.landingPage.update({
      where: { id },
      data: { status: publish ? 'PUBLISHED' : 'DRAFT', publishedAt: publish ? new Date() : null },
    });
    await writeAudit({
      workspaceId: ctx.workspaceId, userId: ctx.user.id,
      action: publish ? 'landing.publish' : 'landing.unpublish',
      entityType: 'LandingPage', entityId: id, summary: page.name,
    });
    revalidatePath('/landing-pages');
    revalidatePath(`/p/${page.slug}`);
    const { appUrl } = await import('@/lib/config');
    return ok({ url: `${appUrl()}/p/${page.slug}` });
  });
}

export async function duplicateLandingPageAction(id: string): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('landing:write');
    const page = await prisma.landingPage.findFirst({
      where: { id, workspaceId: ctx.workspaceId },
      include: { form: { include: { fields: true } } },
    });
    if (!page) return fail('Landing page introuvable');

    let formId: string | null = null;
    if (page.form) {
      const form = await prisma.form.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: `${page.form.name} (copie)`,
          product: page.form.product,
          multiStep: page.form.multiStep,
          steps: page.form.steps as never,
          consentText: page.form.consentText,
          successMessage: page.form.successMessage,
          fields: {
            create: page.form.fields.map((f) => ({
              key: f.key, label: f.label, type: f.type, step: f.step, order: f.order,
              required: f.required, options: f.options as never, placeholder: f.placeholder,
              helpText: f.helpText, conditionField: f.conditionField, conditionValue: f.conditionValue,
            })),
          },
        },
      });
      formId = form.id;
    }

    const copy = await prisma.landingPage.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: `${page.name} (copie)`,
        slug: await uniqueSlug(ctx.workspaceId, `${page.name}-copie`),
        product: page.product,
        status: 'DRAFT',
        sections: page.sections as never,
        theme: page.theme as never,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        formId,
      },
    });
    revalidatePath('/landing-pages');
    return ok({ id: copy.id });
  });
}

export async function deleteLandingPageAction(id: string): Promise<ActionResult<null>> {
  return guard(async () => {
    const ctx = await requireWorkspace('landing:write');
    const page = await prisma.landingPage.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!page) return fail('Landing page introuvable');
    const used = await prisma.campaign.count({ where: { landingPageId: id, status: { in: ['SCHEDULED', 'SENDING'] } } });
    if (used > 0) return fail('Cette page est utilisée par une campagne active.');
    await prisma.landingPage.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, userId: ctx.user.id, action: 'landing.delete', entityType: 'LandingPage', entityId: id, summary: page.name });
    revalidatePath('/landing-pages');
    return ok(null);
  });
}

export async function listLandingTemplatesAction() {
  return guard(async () => {
    await requireWorkspace('landing:read');
    return ok(LANDING_TEMPLATES.map((t) => ({ key: t.key, name: t.name, product: t.product, description: t.description })));
  });
}
