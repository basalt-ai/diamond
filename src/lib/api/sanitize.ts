const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g, // OpenAI keys
  /Bearer\s+[^\s]+/g, // Auth headers
  /postgres(ql)?:\/\/[^\s]+/g, // Connection strings
  /DATABASE_URL=[^\s]+/g, // Env var leaks
  /OPENAI_API_KEY=[^\s]+/g, // OpenAI env var
];

export function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizeString(message);
}

export function sanitizeString(value: string): string {
  let result = value;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}
