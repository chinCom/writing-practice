export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  cacheHitTokens: number;
};

export type AiCallMetadata = {
  usage: TokenUsage;
  model: string;
  latencyMs: number;
  mock: boolean;
};

// Shared by provider adapters and persistence without depending on either implementation.
export type AiResult<Data> = AiCallMetadata & { data: Data };
