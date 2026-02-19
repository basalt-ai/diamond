import type {
  PIIRedactor,
  RedactionResult,
} from "../application/ports/PIIRedactor";

interface PIIPattern {
  name: string;
  regex: RegExp;
  tokenPrefix: string;
}

const PII_PATTERNS: PIIPattern[] = [
  {
    name: "email",
    regex: /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g,
    tokenPrefix: "EMAIL",
  },
  {
    name: "ssn",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    tokenPrefix: "SSN",
  },
  {
    name: "credit_card",
    regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    tokenPrefix: "CARD",
  },
  {
    name: "phone",
    regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    tokenPrefix: "PHONE",
  },
  {
    name: "ip_address",
    regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    tokenPrefix: "IP",
  },
];

export class RegexPIIRedactor implements PIIRedactor {
  redact(text: string): RedactionResult {
    let redactedText = text;
    let totalCount = 0;

    for (const pattern of PII_PATTERNS) {
      let counter = 0;
      redactedText = redactedText.replace(pattern.regex, () => {
        counter++;
        totalCount++;
        return `[${pattern.tokenPrefix}_${String(counter)}]`;
      });
    }

    return { redactedText, redactionCount: totalCount };
  }
}
