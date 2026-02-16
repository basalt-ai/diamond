<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo_white.png" />
  <source media="(prefers-color-scheme: light)" srcset="assets/logo.png" />
  <img src="assets/logo.png" alt="Diamond" width="200" />
</picture>

<br>

**Open-source dataset engine for AI evals** — Author structured scenarios, evolve datasets from production logs, maintain high-quality ground truth.

**[Join Discord](https://discord.gg/yW2RyZKY)** · **[Share Your Pain Points](https://github.com/basalt-ai/diamond/discussions/1)**

<br>

![Build Status](https://github.com/basalt-ai/diamond/actions/workflows/test.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/@basalt-ai/diamond.svg)](https://www.npmjs.com/package/@basalt-ai/diamond)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Discord](https://img.shields.io/discord/1471362791884455980?color=7289da&label=Discord&logo=discord&logoColor=white)](https://discord.gg/yW2RyZKY)

<br />

### Part of the Basalt Stack

<p>
  <strong>Cobalt</strong> (Testing) + <strong>Diamond</strong> (Datasets) + <strong>Limestone</strong> (Judges) + <strong>Asphalt</strong> (Optimization)
</p>

</div>

---

## The Problem: Eval Datasets Are Fundamentally Broken

**Static datasets that drift over time.** You create a dataset once, then your product evolves, user behavior changes, and edge cases emerge that your dataset never covered. Six months later, you're evaluating against scenarios that no longer represent reality.

**Poorly defined expected outputs.** Half your dataset has vague expected outputs like "helpful response" or "correct answer." When your LLM judge sees these, it's guessing what "correct" actually means. Your eval scores become meaningless noise.

**Random sampling from production logs.** You grab 100 random examples from last month's logs, manually label them, and call it a dataset. No systematic coverage, no understanding of what scenarios you're actually testing, massive blind spots everywhere.

**Zero visibility into coverage.** You have no idea if your dataset covers 10% or 90% of your real-world scenarios. Are you testing edge cases? High-value user segments? Complex multi-step interactions? You're flying blind.

**Manual dataset creation that doesn't scale.** Every time you need a new dataset, someone spends weeks manually creating examples, writing expected outputs, and hoping they captured the important scenarios. It's expensive, slow, and never comprehensive.

## Why This Kills AI Development

**False confidence in your models.** Your evals show 85% accuracy, so you deploy. Then production performance tanks because your dataset missed the scenarios that actually matter to users.

**Wasted time on irrelevant optimizations.** You spend weeks optimizing for scenarios that represent 2% of your traffic while ignoring the 80% that drives business value.

**No systematic improvement.** Without comprehensive coverage analysis, you can't identify which capabilities to improve. You're playing whack-a-mole with individual failures instead of systematic enhancement.

**Expensive firefighting.** Production issues that should have been caught in evals slip through. Every outage could have been prevented with better dataset coverage.

## What Should Exist Instead

**Structured scenario generation** where domain experts define the dimensions that matter, and datasets automatically cover the full combinatorial space of real-world situations.

**Living datasets** that evolve with your product, automatically incorporating new patterns from production logs while maintaining high-quality ground truth.

**Coverage analysis** that shows exactly which scenarios you're testing and which blind spots remain, with metrics on heterogeneity and representativeness.

**Quality gates** that ensure dataset quality before you deploy new models, with automated detection of drift, duplication, and coverage gaps.

**Expert feedback loops** that capture domain knowledge from specialists and convert it into systematic dataset improvements.

## Join the Movement

We're building Diamond to fix the broken state of evaluation datasets. But we need to understand your specific pain points first.

**[Tell us about your dataset struggles →](https://github.com/basalt-ai/diamond/discussions/1)**

What challenges do you face?
- Static datasets that become stale?
- Poor coverage of edge cases?
- Manual dataset creation that doesn't scale?
- Unclear expected outputs?
- No visibility into what scenarios you're testing?

Your experiences directly shape what we build. Every pain point shared helps us create better solutions for the entire AI development community.

⭐ **Star this repo to follow our progress** — we'll be sharing our approach to systematic dataset generation as we validate the core problems.

---

**Built and maintained by [Basalt](https://getbasalt.ai). Open source forever under Apache 2.0.**