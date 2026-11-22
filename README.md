# Insight Factories

An observability module for domain data governance. For each business domain and subdomain it shows the state of the data, an AI-Ready score with two axes, the causes behind the score and the tasks that move it. An optional game layer shows each subdomain as a factory and the company as a world of factories.

This repository is a demo on synthetic data for **Harbor Market**, a fictional online marketplace and classifieds platform. No real company, people or production data are involved: every number comes from `pipeline/generate.mjs`.

## Who it is for

Each domain has governance roles, and the portal is their shared view:

- **BI partner** (production manager) — owns the domain's analytics and the subdomain cabinet;
- **data owner** (factory director) — the business owner of the domain's data;
- **metrics curator** (warehouse keeper) — keeps the domain's metrics in the Semantic Layer healthy;
- **AI champion** (AI technician) — drives AI-assisted analytics in the domain.

The portal shows state and does not change it. Every action links out to the tool where the work happens: Dashboards, Semantic Layer, Data Catalog, Data Contracts, Git, Knowledge Base. In the demo these links are placeholders.

## Run locally

Requirements: Node 20+ and Python 3 (or any static HTTP server). No build step, no dependencies.

```bash
node pipeline/generate.mjs        # writes app/data/*.js; optional seed: node pipeline/generate.mjs 7
cd app && python3 -m http.server 8080
```

Open http://localhost:8080/. The generator is deterministic: the same seed gives the same data.

## Project structure

| Path | What it is |
|---|---|
| `app/` | The static site: HTML pages, ES modules, styles. See [app/README.md](app/README.md) for the module map |
| `app/data/` | Generated synthetic data modules (domains, objects, people, trends, operations, cost, lineage) |
| `app/vendor/` | three.js (MIT) for the 3D pages |
| `app/docs` | Symlink to `docs/`, so `doc.html` can show the docs |
| `pipeline/generate.mjs` | Synthetic data generator for Harbor Market |
| `docs/functional-blocks.md` | Specification: functional blocks A1–G5 with requirements, status and references |
| `docs/references.md` | Market references by block, built by `python3 docs/build_refs.py` |
| `docs/glossary-kg-design.md` | Design note for the glossary as a knowledge graph |
| `docs/design-tokens.md` | Design tokens of the demo's visual identity |
| `docs/video-script.md` | A short script for a demo walkthrough recording |

## Pages and routes

| Page | Route | What it shows |
|---|---|---|
| `index.html` | `#/` | Platform overview: health, AI-Ready score and levels, readiness-versus-result chart, domain ranking, factory performance |
| | `#/d/<domain>` | Domain cabinet: indicators, subdomain cards, the same tabs as a subdomain |
| | `#/s/<i>/<tab>` | Subdomain cabinet. Tabs: overview, `ards` (AI-Ready Score), `ai` (Self-service AI), `met` (metrics), `gl` (glossary), `dm` (data marts), `dash` (dashboards), `ops` (reliability), `infra` (infracost) |
| | `#/hot` | Problem registry: popular objects that fail the health score |
| | `#/me`, `#/digest` | My factories and the weekly digest preview |
| | `#/onboarding/<i>` | BI partner onboarding checklist for a subdomain |
| | `#/new` | Domain creation form (stub) |
| `domain.html?d=<i>` | | 3D factory of one subdomain: raw materials → workshops (data marts) → warehouses (metrics) → docks (dashboards); add `&tour=1` for a guided tour |
| `world.html` | | 3D Insight Factories world: domains as industrial zones, roads and trucks for data exchange, monthly awards |
| `graph.html?d=<i>` | | Links window: cost × value, lineage graph in 2D and 3D, flow (Sankey) |
| `doc.html?f=spec\|refs\|glossary` | | The docs from `docs/` rendered in the app |

## AI-Ready score in brief

Two axes, each the mean completion of its components against targets over a 30-day window.

- **Axis 1 · Readiness:** 1.1 Trusted data marts, 1.2 Traffic through trusted semantics, 1.3 Trusted dashboards, 1.4 Domain knowledge (logic to be defined, excluded).
- **Axis 2 · Result:** 2.1 Answer quality, 2.2 Question coverage, 2.3 Self-service analytics with AI, 2.4 Infracost per healthy object (lower is better).
- **AI-Ready score = min(Readiness, Result).** Improving one axis alone does not raise it.
- **Levels L0–L4.** Leaving L0 requires an assigned BI partner and data owner plus readiness ≥ 40; higher levels add readiness thresholds, a Knowledge Base skill, a golden set and result targets.
- **Domains and the company** are scored by pooling the objects of their subdomains, not by averaging subdomain scores.

Details: [docs/functional-blocks.md](docs/functional-blocks.md), block G4.

## Credits

The design draws on public products and games, listed block by block in [docs/references.md](docs/references.md). Among them: Backstage, Spotify Soundcheck, Cortex, OpsLevel, Monte Carlo, Sifflet, DataHub, Atlan, Microsoft Purview, dbt, Snowflake, Databricks, Airbnb's Data Quality Score, Uber Databook, Neo4j Bloom, the ISA-101 HMI standard, and the games Factorio, Cities: Skylines, The Sims, Two Point Hospital and Mini Metro. All trademarks belong to their owners; this project is not affiliated with them.

3D rendering uses [three.js](https://threejs.org) (MIT).

## License

MIT — see [LICENSE](LICENSE).
