import type { UUID } from "@/shared/types";

import type {
  ContextProfileData,
  CreateContextProfileInput,
  UpdateContextProfileInput,
} from "../../domain/entities/ContextProfile";
import type {
  CreateFailureModeInput,
  FailureModeData,
  UpdateFailureModeInput,
} from "../../domain/entities/FailureMode";
import type {
  CreateRiskTierInput,
  RiskTierData,
  UpdateRiskTierInput,
} from "../../domain/entities/RiskTier";
import type {
  CreateScenarioTypeInput,
  ListScenarioTypesFilter,
  ScenarioTypeData,
  ScenarioTypeWithRelations,
  UpdateScenarioTypeInput,
} from "../../domain/entities/ScenarioType";

export interface ScenarioRepository {
  // ── FailureModes ──────────────────────────────────────────────
  createFailureMode(input: CreateFailureModeInput): Promise<FailureModeData>;
  getFailureMode(id: UUID): Promise<FailureModeData>;
  listFailureModes(): Promise<FailureModeData[]>;
  updateFailureMode(
    id: UUID,
    input: UpdateFailureModeInput
  ): Promise<FailureModeData>;
  deleteFailureMode(id: UUID): Promise<void>;
  isFailureModeReferenced(id: UUID): Promise<boolean>;

  // ── RiskTiers ─────────────────────────────────────────────────
  createRiskTier(input: CreateRiskTierInput): Promise<RiskTierData>;
  getRiskTier(id: UUID): Promise<RiskTierData>;
  listRiskTiers(): Promise<RiskTierData[]>;
  updateRiskTier(id: UUID, input: UpdateRiskTierInput): Promise<RiskTierData>;
  deleteRiskTier(id: UUID): Promise<void>;
  isRiskTierReferenced(id: UUID): Promise<boolean>;

  // ── ContextProfiles ───────────────────────────────────────────
  createContextProfile(
    input: CreateContextProfileInput
  ): Promise<ContextProfileData>;
  getContextProfile(id: UUID): Promise<ContextProfileData>;
  listContextProfiles(): Promise<ContextProfileData[]>;
  updateContextProfile(
    id: UUID,
    input: UpdateContextProfileInput
  ): Promise<ContextProfileData>;
  deleteContextProfile(id: UUID): Promise<void>;
  isContextProfileReferenced(id: UUID): Promise<boolean>;

  // ── ScenarioTypes ─────────────────────────────────────────────
  createScenarioType(
    input: CreateScenarioTypeInput
  ): Promise<ScenarioTypeWithRelations>;
  getScenarioType(id: UUID): Promise<ScenarioTypeWithRelations>;
  listScenarioTypes(
    filter?: ListScenarioTypesFilter
  ): Promise<ScenarioTypeData[]>;
  updateScenarioType(
    id: UUID,
    input: UpdateScenarioTypeInput
  ): Promise<ScenarioTypeWithRelations>;
  archiveScenarioType(id: UUID): Promise<ScenarioTypeData>;
  getAncestorIds(id: UUID): Promise<UUID[]>;
}
