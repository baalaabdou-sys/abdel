import type { AiCompletionRequest, AiCompletionResponse, AiProvider } from './types';

const API = 'https://api.openai.com/v1/chat/completions';

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  readonly simulated = false;
  readonly model: string;

  constructor(private apiKey: string, model?: string) {
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const messages = [
      ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
      ...request.messages,
    ];
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: request.maxTokens ?? 2000,
        temperature: request.temperature ?? 0.4,
        ...(request.jsonSchemaHint ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: json.choices[0]?.message?.content ?? '',
      provider: this.name,
      model: this.model,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      simulated: false,
    };
  }
}
