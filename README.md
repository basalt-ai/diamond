<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo_white.png" />
  <source media="(prefers-color-scheme: light)" srcset="assets/logo.png" />
  <img src="assets/logo.png" alt="Diamond" width="200" />
</picture>

<br>

**Open-source dataset engine for AI evals** — Author structured scenarios, evolve datasets from production logs, maintain high-quality ground truth.

**[Documentation](docs/)** · **[Join Discord](https://discord.gg/yW2RyZKY)**

<br>

![Build Status](https://github.com/basalt-ai/diamond/actions/workflows/test.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/@basalt-ai/diamond.svg)](https://www.npmjs.com/package/@basalt-ai/diamond)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Discord](https://img.shields.io/discord/1471362791884455980?color=7289da&label=Discord&logo=discord&logoColor=white)](https://discord.gg/yW2RyZKY)

<br />

### Part of the Basalt Stack

<p>
  <strong>Cobalt</strong> (Testing) + <strong>Diamond</strong> (Datasets) + <strong>Limestone</strong> (Judges) + <strong>Asphalt</strong> (Optimization)
</p>

</div>

---

## Table of Contents

- [Why Diamond](#why-diamond)
- [Quickstart](#quickstart)
- [Core Concepts](#core-concepts)
- [Dataset Evolution](#dataset-evolution)
- [Coverage Analysis](#coverage-analysis)
- [Production Integration](#production-integration)
- [CLI](#cli)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why Diamond

Eval datasets are fundamentally broken. They start with poorly defined expected outputs, become static and drift over time, rely on random sampling from production logs, and provide zero visibility into what scenarios they actually cover. Diamond fixes this.

Diamond is a dataset engine that lets domain experts author structured evaluation scenarios, automatically evolves datasets from production logs, analyzes coverage and heterogeneity, and maintains high-quality ground truth over time. No more guessing if your eval dataset actually represents your production traffic.

## Quickstart

```bash
npm install @basalt-ai/diamond
npx diamond init
npx diamond generate --from-logs ./logs/
```

Create your first structured scenario:

```typescript
// scenarios/customer-support.diamond.ts
import { scenario, Domain } from '@basalt-ai/diamond'

const customerSupport = new Domain({
  name: 'customer-support',
  dimensions: [
    'urgency', // low, medium, high, critical
    'category', // billing, technical, account, product
    'sentiment', // positive, neutral, negative, angry
    'complexity' // simple, moderate, complex, multi-step
  ]
})

scenario('billing-urgent-angry', {
  domain: customerSupport,
  constraints: {
    urgency: 'high',
    category: 'billing',
    sentiment: 'angry'
  },
  template: {
    customer_message: "I've been charged {{amount}} for {{service}} that I cancelled {{days_ago}} days ago! This is unacceptable!",
    expected_actions: ['refund_processing', 'escalate_to_billing'],
    expected_tone: 'empathetic_professional'
  }
})

// Auto-generate 50 variants
export default scenario.generate({ count: 50 })
```

```bash
npx diamond build --scenario customer-support
npx diamond analyze --coverage
```

## Core Concepts

### Domain

A structured representation of your problem space. Domains define the key dimensions that matter for your use case (urgency, category, sentiment, etc.) and the valid values for each. Diamond uses domains to ensure your dataset covers the full combinatorial space of scenarios you care about.

```typescript
const domain = new Domain({
  name: 'email-classification',
  dimensions: [
    { name: 'intent', values: ['question', 'complaint', 'request', 'spam'] },
    { name: 'urgency', values: ['low', 'medium', 'high'] },
    { name: 'language', values: ['en', 'es', 'fr', 'de'] }
  ]
})
```

### Scenario

A template for generating evaluation examples within a domain. Scenarios define constraints (which dimension values to use), templates (how to generate the actual examples), and expected outputs. One scenario can generate hundreds of variants.

```typescript
scenario('urgent-complaint', {
  domain: emailDomain,
  constraints: { intent: 'complaint', urgency: 'high' },
  template: {
    subject: "Urgent: {{issue_type}} - {{reference_number}}",
    body: "{{complaint_text}} This needs immediate attention!",
    expected_classification: 'complaint',
    expected_urgency: 'high',
    expected_priority: 1
  }
})
```

### Evolution Engine

Diamond continuously learns from your production logs to evolve datasets over time. It identifies new patterns, edge cases, and distribution shifts, then automatically generates scenarios to cover gaps in your current dataset.

```typescript
// Evolve from production logs
await diamond.evolve({
  source: 'logs/production-2024-02.jsonl',
  strategy: 'coverage-driven', // Focus on covering new scenarios
  threshold: 0.8 // Only add if confidence > 80%
})
```

## Dataset Evolution

Traditional datasets become stale. Diamond datasets evolve with your product.

### From Production Logs

Point Diamond at your production logs, and it will automatically identify new patterns and edge cases:

```bash
# Analyze logs for new patterns
npx diamond analyze --logs ./logs/january-2024.jsonl --domain customer-support

# Generate scenarios for uncovered patterns  
npx diamond evolve --strategy coverage-gaps --confidence 0.85

# Review proposed scenarios before adding
npx diamond review --pending
```

### Continuous Learning

Set up Diamond to continuously learn from your production traffic:

```typescript
// diamond.config.ts
export default {
  evolution: {
    enabled: true,
    schedule: 'daily',
    sources: [
      { type: 'logs', path: './logs/*.jsonl' },
      { type: 'feedback', endpoint: '/api/feedback' }
    ],
    strategy: 'balanced', // Balance coverage and quality
    autoApprove: { threshold: 0.9 } // Auto-approve high-confidence scenarios
  }
}
```

### Expert Feedback Integration

Domain experts review and refine scenarios through Diamond's interface:

```bash
# Start the review interface
npx diamond serve --mode review

# Experts can:
# - Approve/reject proposed scenarios
# - Refine templates and expected outputs
# - Add new constraints and dimensions
# - Flag problematic examples
```

## Coverage Analysis

Diamond analyzes your dataset's coverage across all dimensions and identifies gaps:

```bash
# Analyze coverage
npx diamond analyze --coverage --domain customer-support

# Output:
# Coverage Report - customer-support
# ================================
# Overall coverage: 73% (146/200 combinations)
# 
# Dimension coverage:
# - urgency: 100% (4/4 values covered)
# - category: 75% (3/4 values covered) ⚠️  Missing: [refunds]
# - sentiment: 100% (4/4 values covered) 
# - complexity: 50% (2/4 values covered) ⚠️  Missing: [multi-step, escalation]
#
# Under-represented combinations:
# - [urgent + refunds]: 0 examples
# - [complex + billing]: 2 examples (target: 10)
# - [angry + multi-step]: 1 example (target: 8)
```

### Heterogeneity Metrics

Ensure your dataset is diverse enough to be meaningful:

```bash
npx diamond analyze --heterogeneity

# Lexical diversity: 0.82 (good)
# Semantic clustering: 12 distinct clusters found
# Template variety: 89% unique templates
# Length distribution: Normal (μ=156, σ=43 tokens)
```

## Production Integration

Diamond integrates with your existing workflow:

### Log Ingestion

```typescript
// Ingest from common formats
import { LogIngester } from '@basalt-ai/diamond'

const ingester = new LogIngester({
  format: 'jsonl', // or 'csv', 'parquet'
  schema: {
    input: 'user_message',
    output: 'agent_response', 
    metadata: ['timestamp', 'user_id', 'session_id']
  }
})

await ingester.process('./logs/production.jsonl')
```

### Quality Gates

Ensure dataset quality before deploying new models:

```typescript
// In your CI pipeline
const qualityCheck = await diamond.validate({
  dataset: 'customer-support-v2',
  requirements: {
    minCoverage: 0.80,
    minHeterogeneity: 0.75,
    maxDuplication: 0.05
  }
})

if (!qualityCheck.passed) {
  throw new Error(`Dataset quality check failed: ${qualityCheck.issues}`)
}
```

### Export Integration

Export to your evaluation framework:

```bash
# Export for Cobalt
npx diamond export --format cobalt --output ./datasets/customer-support.json

# Export for LangSmith  
npx diamond export --format langsmith --dataset customer-support-v2

# Export for Braintrust
npx diamond export --format braintrust --project my-agent --dataset latest
```

## CLI

```bash
diamond init                        # Initialize new Diamond project
diamond generate <scenario>         # Generate examples from scenario  
diamond build --all                 # Build all scenarios
diamond analyze --coverage         # Analyze dataset coverage
diamond analyze --heterogeneity    # Analyze dataset diversity
diamond evolve --from-logs <path>  # Evolve dataset from logs
diamond review --pending           # Review pending scenarios
diamond export --format <format>   # Export to evaluation platform
diamond serve --mode <mode>        # Start Diamond interface
diamond clean                      # Clean generated files
```

## Roadmap

Diamond is open source and community-driven. [Tell us what matters to you](https://github.com/basalt-ai/diamond/discussions/1).

| Status | Feature |
|--------|---------|
| :construction: | **Core scenario engine** - Domain modeling and scenario generation |
| :construction: | **Coverage analysis** - Multi-dimensional coverage reporting |
| :crystal_ball: | **Log evolution** - Auto-evolve datasets from production logs |
| :crystal_ball: | **Expert interface** - Web UI for scenario review and refinement |
| :crystal_ball: | **Quality gates** - CI integration for dataset quality checks |
| :crystal_ball: | **Advanced analytics** - Drift detection and distribution analysis |
| :crystal_ball: | **Multi-format support** - Parquet, Arrow, and streaming ingestion |
| :crystal_ball: | **Collaborative editing** - Team workflows for scenario management |

⭐ **Star this repo to follow progress**

## Contributing

We welcome contributions! See our **[Contributing Guide](CONTRIBUTING.md)** for development setup, code standards, and PR process.

- **Report bugs**: [Open an issue](https://github.com/basalt-ai/diamond/issues)
- **Request features**: [GitHub Discussions](https://github.com/basalt-ai/diamond/discussions)
- **Join Discord**: [Basalt Community](https://discord.gg/yW2RyZKY)

Built and maintained by [Basalt](https://getbasalt.ai). Open source forever under Apache 2.0.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.