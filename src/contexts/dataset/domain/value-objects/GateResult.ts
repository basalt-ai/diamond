export interface GateResult {
  gate: string;
  threshold: number;
  actual: number;
  passed: boolean;
  blocking: boolean;
  scope: string;
  scopeTarget: string | null;
}
