export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  modelId: string;
  modelVersion: string;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<EmbeddingResult[]>;
  getModelId(): string;
  getDimensions(): number;
}
