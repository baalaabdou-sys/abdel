import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from './types';

const API = 'https://api.anthropic.com/v1/messages';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly simulated = false;
  readonly model: string;

  constructor(private apiKey: string, model?: string) {
    this.model = model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.4,
        system: request.system,
        messages: request.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = json.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
    return {
      text,
      provider: this.name,
      model: this.model,
      inputTokens: json.usage?.input_tokens ?? 0,
      outputTokens: json.usage?.output_tokens ?? 0,
      simulated: false,
    };
  }
}
