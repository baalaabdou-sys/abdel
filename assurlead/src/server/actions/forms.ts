'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireWorkspace, guard, ok, fail, type ActionResult } from '../context';

const fieldSchema = z.object({
  id: z.string().optional(),
  key: z.string().regex(/^[a-z0-9_]+$/, 'Clé technique : minuscules, chiffres et _ uniquement').max(40),
  label: z.string().min(1).max(300),
  type: z.enum(['text', 'email', 'tel', 'number', 'date', 'select', 'radio', 'checkbox', 'textarea', 'postal']),
  step: z.coerce.number().int().min(1).max(10),
  order: z.coerce.number().int().min(0).max(100),
  required: z.boolean(),
  options: z.array(z.object({ value: z.string().max(60), label: z.string().max(160) })).default([]),
  placeholder: z.string().max(120).default(''),
  helpText: z.string().max(300).default(''),
  conditionField: z.string().max(40).optional().nullable(),
  conditionValue: z.string().max(60).optional().nullable(),
});

const formSchema = z.object({
  name: z.string().min(2).max(120),
  multiStep: z.boolean(),
  steps: z.array(z.object({ key: z.string().max(40), title: z.string().max(120), description: z.string().max(300).default('') })),
  consentText: z.string().max(1000),
  successMessage: z.string().max(500),
  fields: z.array(fieldSchema).min(1, 'Le formulaire doit contenir au moins un champ').max(40),
});

export async function saveFormAction(formId: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const ctx = await requireWorkspace('landing:write');
    const parsed = formSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return fail(first ? `${first.path.join('.')} : ${first.message}` : 'Formulaire invalide');
    }

    const form = await prisma.form.findFirst({ where: { id: formId, workspaceId: ctx.workspaceId } });
    if (!form) return fail('Formulaire introuvable');

    const keys = parsed.data.fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) return fail('Deux champs utilisent la même clé technique.');

    const keepIds = parsed.data.fields.map((f) => f.id).filter(Boolean) as string[];
    await prisma.formField.deleteMany({ where: { formId, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) } });

    for (const f of parsed.data.fields) {
      const data = {
        key: f.key, label: f.label, type: f.type, step: f.step, order: f.order,
        required: f.required, options: f.options as never, placeholder: f.placeholder,
        helpText: f.helpText, conditionField: f.conditionField || null, conditionValue: f.conditionValue || null,
      };
      if (f.id) await prisma.formField.update({ where: { id: f.id }, data });
      else await prisma.formField.create({ data: { ...data, formId } });
    }

    await prisma.form.update({
      where: { id: formId },
      data: {
        name: parsed.data.name,
        multiStep: parsed.data.multiStep,
        steps: parsed.data.steps as never,
        consentText: parsed.data.consentText,
        successMessage: parsed.data.successMessage,
      },
    });

    revalidatePath('/landing-pages');
    return ok({ id: formId });
  });
}
