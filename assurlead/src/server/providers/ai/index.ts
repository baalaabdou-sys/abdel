import 'server-only';
import { prisma } from '@/lib/db';
import { decryptConfig } from '@/lib/crypto';
import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAiProvider } from './openai';
import { DemoAiProvider } from './demo';

export type { AiProvider, AiCompletionRequest, AiCompletionResponse };

/**
 * Resolves the AI provider for a workspace.
 * Order: workspace integration → environment variables → DEMO fallback.
 * The DEMO provider never calls an external service and marks its output as simulated.
 */
export async function getAiProvider(workspaceId?: string): Promise<AiProvider> {
  if (workspaceId) {
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, kind: 'AI', status: 'CONNECTED' },
      orderBy: { updatedAt: 'desc' },
    });
    if (integration) {
      const cfg = decryptConfig(integration.config as Record<string, unknown>);
      const apiKey = String(cfg.apiKey ?? '');
      if (apiKey) {
        if (integration.provider === 'anthropic') return new AnthropicProvider(apiKey, String(cfg.model ?? '') || undefined);
        if (integration.provider === 'openai') return new OpenAiProvider(apiKey, String(cfg.model ?? '') || undefined);
      }
    }
  }

  const envProvider = (process.env.AI_PROVIDER ?? 'demo').toLowerCase();
  if (envProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
  }
  if (envProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(process.env.OPENAI_API_KEY);
  }
  return new DemoAiProvider();
}

/** Runs a completion and records usage for cost tracking. */
export async function runAi(
  workspaceId: string,
  request: AiCompletionRequest,
): Promise<AiCompletionResponse> {
  const provider = await getAiProvider(workspaceId);
  const response = await provider.complete(request);
  const periodMonth = new Date().toISOString().slice(0, 7);
  await prisma.apiUsage.createMany({
    data: [
      { workspaceId, kind: 'AI_REQUEST', provider: response.provider, quantity: 1, periodMonth },
      {
        workspaceId,
        kind: 'AI_TOKENS',
        provider: response.provider,
        quantity: response.inputTokens + response.outputTokens,
        periodMonth,
        metadata: { input: response.inputTokens, output: response.outputTokens, model: response.model },
      },
    ],
  });
  return response;
}

/** Parses a JSON payload out of a model response, tolerating fenced blocks. */
export function parseAiJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(candidate) as T;
}
