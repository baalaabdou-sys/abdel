/**
 * Dev helper: prints a valid session cookie for a seeded user so the app can be
 * exercised with curl or an automated smoke test. Development use only.
 */
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusé en production.');
  const email = process.argv[2] ?? 'owner@assurlead.fr';
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const raw = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + 86_400_000);
  const session = await prisma.session.create({ data: { userId: user.id, tokenHash, expiresAt } });
  const jwt = await new SignJWT({ sub: user.id, sid: session.id, k: raw })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
  const membership = await prisma.workspaceMember.findFirstOrThrow({ where: { userId: user.id } });
  process.stdout.write(`assurlead_session=${jwt}; assurlead_ws=${membership.workspaceId}\n`);
}

main().finally(() => prisma.$disconnect());
