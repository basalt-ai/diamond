export interface RedactionResult {
  redactedText: string;
  redactionCount: number;
}

export interface PIIRedactor {
  redact(text: string): RedactionResult;
}
