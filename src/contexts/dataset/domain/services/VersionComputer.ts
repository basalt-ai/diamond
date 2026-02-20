import type { VersionBumpRule } from "../value-objects/RefreshPolicy";

export interface GraphChange {
  change_type: "added" | "modified" | "removed";
  entity_type: string;
  entity_id: string;
  summary?: string;
}

export class VersionComputer {
  computeNext(
    lastReleased: string | null,
    changes: GraphChange[],
    rule: VersionBumpRule
  ): string {
    if (!lastReleased) return "1.0.0";

    const [major, minor, patch] = this.parseSemver(lastReleased);

    if (rule === "minor") return `${major}.${minor + 1}.0`;
    if (rule === "patch") return `${major}.${minor}.${patch + 1}`;

    // rule === "auto": determine from changes
    const hasRemovals = changes.some((c) => c.change_type === "removed");
    const hasAdditions = changes.some((c) => c.change_type === "added");

    if (hasRemovals) return `${major + 1}.0.0`;
    if (hasAdditions) return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  }

  private parseSemver(version: string): [number, number, number] {
    const cleaned = version.replace(/^v/, "");
    const parts = cleaned.split(".");
    return [
      Number.parseInt(parts[0] ?? "1", 10),
      Number.parseInt(parts[1] ?? "0", 10),
      Number.parseInt(parts[2] ?? "0", 10),
    ];
  }
}
