import 'server-only';
import type { ReplyCategory } from '@prisma/client';
import { runAi, parseAiJson } from '../providers/ai';

const SYSTEM = `[TASK:REPLY_CLASSIFY]
Tu classes la réponse d'un prospect à un email d'assurance et proposes un brouillon de réponse.

Catégories : INTERESTED, CALLBACK_REQUEST, QUOTE_REQUEST, QUESTION, NOT_INTERESTED, NOT_NOW, UNSUBSCRIBE, OUT_OF_OFFICE, OTHER.

Le brouillon ne doit contenir aucun tarif, aucune garantie chiffrée et aucune promesse.
Il sera relu par un humain avant envoi.

Réponds UNIQUEMENT en JSON : {"category","reasoning","confidence",\"suggestedReply\"}`;

export type ClassifiedReply = {
  category: ReplyCategory;
  reasoning: string;
  confidence: number;
  suggestedReply: string;
  simulated: boolean;
};

const VALID: ReplyCategory[] = [
  'INTERESTED', 'CALLBACK_REQUEST', 'QUOTE_REQUEST', 'QUESTION',
  'NOT_INTERESTED', 'NOT_NOW', 'UNSUBSCRIBE', 'OUT_OF_OFFICE', 'OTHER',
];

export async function classifyReply(workspaceId: string, subject: string, body: string): Promise<ClassifiedReply> {
  const response = await runAi(workspaceId, {
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ subject, body: body.slice(0, 4000) }) }],
    maxTokens: 900,
    temperature: 0.1,
  });
  const parsed = parseAiJson<{ category?: string; reasoning?: string; confidence?: number; suggestedReply?: string }>(response.text);
  const category = VALID.includes(parsed.category as ReplyCategory) ? (parsed.category as ReplyCategory) : 'OTHER';
  return {
    category,
    reasoning: parsed.reasoning ?? '',
    confidence: parsed.confidence ?? 0.5,
    suggestedReply: parsed.suggestedReply ?? '',
    simulated: response.simulated,
  };
}
