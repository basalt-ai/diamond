import { sql } from "drizzle-orm";

import type { Database } from "@/db";
import type { UUID } from "@/shared/types";

import type {
  CoverageComputer,
  CoverageReport,
} from "../application/ports/CoverageComputer";

export class SqlCoverageComputer implements CoverageComputer {
  constructor(private readonly db: Database) {}

  async compute(): Promise<CoverageReport> {
    // Count candidates per scenario type (scored or beyond)
    const byScenario = await this.db.execute(sql`
      SELECT
        st.id,
        st.name,
        COUNT(c.id) FILTER (WHERE c.state != 'raw') AS candidate_count,
        COUNT(c.id) FILTER (WHERE c.state IN ('labeled', 'validated', 'released')) AS dataset_count
      FROM sc_scenario_types st
      LEFT JOIN cd_candidates c ON c.scenario_type_id = st.id
      GROUP BY st.id, st.name
      ORDER BY st.name
    `);

    const rows = byScenario as unknown as Array<{
      id: string;
      name: string;
      candidate_count: string;
      dataset_count: string;
    }>;

    const totalScenarioTypes = rows.length;
    const totalCandidates = rows.reduce(
      (sum, r) => sum + Number(r.candidate_count),
      0
    );
    const coveredScenarioTypes = rows.filter(
      (r) => Number(r.candidate_count) > 0
    ).length;

    const byScenarioType = rows.map((r) => ({
      id: r.id as UUID,
      name: r.name,
      count: Number(r.candidate_count),
      pct:
        totalCandidates > 0 ? Number(r.candidate_count) / totalCandidates : 0,
    }));

    const gaps = rows
      .filter(
        (r) => Number(r.candidate_count) === 0 || Number(r.dataset_count) === 0
      )
      .map((r) => ({
        scenarioTypeId: r.id as UUID,
        name: r.name,
        candidateCount: Number(r.candidate_count),
        datasetCount: Number(r.dataset_count),
      }));

    // Count by risk tier
    const byRiskResult = await this.db.execute(sql`
      SELECT
        rt.name,
        COUNT(c.id) AS count
      FROM sc_risk_tiers rt
      LEFT JOIN sc_scenario_types st ON st.risk_tier_id = rt.id
      LEFT JOIN cd_candidates c ON c.scenario_type_id = st.id AND c.state != 'raw'
      GROUP BY rt.name
      ORDER BY rt.name
    `);

    const riskRows = byRiskResult as unknown as Array<{
      name: string;
      count: string;
    }>;
    const totalByRisk = riskRows.reduce((sum, r) => sum + Number(r.count), 0);
    const byRiskTier = riskRows.map((r) => ({
      name: r.name,
      count: Number(r.count),
      pct: totalByRisk > 0 ? Number(r.count) / totalByRisk : 0,
    }));

    return {
      totalScenarioTypes,
      coveredScenarioTypes,
      scenarioCoveragePct:
        totalScenarioTypes > 0 ? coveredScenarioTypes / totalScenarioTypes : 0,
      byScenarioType,
      byRiskTier,
      gaps,
    };
  }
}
