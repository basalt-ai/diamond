export interface ReadinessData {
  ready: boolean;
  missing: string[];
  counts: {
    riskTiers: number;
    failureModes: number;
    scenarioTypes: number;
  };
}

export interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onReadinessChange: () => void;
}
