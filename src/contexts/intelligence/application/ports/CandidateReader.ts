import type { UUID } from "@/shared/types";

export interface CandidateSnapshot {
  id: UUID;
  episodeId: UUID;
  scenarioTypeId: UUID | null;
  state: string;
  scores: Record<string, number> | null;
  features: Record<string, unknown> | null;
  embeddedAt: Date | null;
  scoringDirty: boolean;
}

export interface CandidateReader {
  findById(id: UUID): Promise<CandidateSnapshot | null>;
  findDirty(limit?: number): Promise<CandidateSnapshot[]>;
  findUnembedded(limit?: number): Promise<CandidateSnapshot[]>;
  findScored(): Promise<CandidateSnapshot[]>;
  countByState(): Promise<Record<string, number>>;
}
