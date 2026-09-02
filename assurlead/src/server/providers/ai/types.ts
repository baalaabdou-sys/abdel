export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiCompletionRequest = {
  system?: string;
  messages: AiMessage[];
  maxTokens?: number;
  temperature?: number;
  /** When set, the provider is asked to return JSON matching this shape description. */
  jsonSchemaHint?: string;
};

export type AiCompletionResponse = {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** True when the answer came from the built-in deterministic DEMO provider. */
  simulated: boolean;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  readonly simulated: boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
