import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { requireWorkspace } from '@/server/context';
import { UPLOAD_DIR } from '@/server/services/import';
import { checkRateLimit } from '@/server/services/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = ['.csv', '.txt', '.xlsx', '.xls'];

/** Stages an uploaded contact file on disk and returns its handle. */
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireWorkspace('contacts:import');
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const limit = await checkRateLimit(`import-upload:${ctx.workspaceId}`, 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Trop de téléversements. Patientez une minute.' }, { status: 429 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (50 Mo maximum)' }, { status: 413 });

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: 'Format non supporté. Utilisez CSV ou XLSX.' }, { status: 415 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const uploadId = `${ctx.workspaceId.slice(0, 8)}-${crypto.randomBytes(10).toString('hex')}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, uploadId), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ uploadId, filename: file.name, size: file.size });
}
