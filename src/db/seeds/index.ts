import { seedRiskTiers } from "./risk-tiers";

async function main() {
  console.log("Running seeds...");
  await seedRiskTiers();
  console.log("Seeds complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
