# Market references — Insight Factories

The products and games the demo design draws on: for each functional block, one or two examples we consider the best, and what exactly we took from them.
Built from the [functional blocks spec](functional-blocks.md) by `docs/build_refs.py`. Edit the spec, not this file.

## A. Shell

| Block | Reference | What we take |
|---|---|---|
| A1 Shell and navigation | [Backstage Software Catalog](https://backstage.io/docs/features/software-catalog/) | entity catalog with tabs on the entity page; the same "catalog → cabinet" model |
| A1 Shell and navigation | [Linear](https://linear.app) | dense, minimal keyboard navigation, a model of a calm interface |
| A2 Global search | [Linear](https://linear.app) | Cmd+K command palette: search and navigation in one window |
| A2 Global search | [DataHub](https://datahub.com/products/) | search across all data types with facets by domain and type |
| A3 Mode switch | [Celonis Process Explorer](https://www.celonis.com/) | detail slider: from the main flow to individual variants on the same screen |
| A3 Mode switch | [Factorio](https://factorio.com) | map view: a seamless switch from the detailed view to the overview |

## B. Platform overview

| Block | Reference | What we take |
|---|---|---|
| B1 Platform summary | [Microsoft Purview Data Governance Report](https://learn.microsoft.com/en-us/purview/unified-catalog-reports-data-governance) | a short set of controls broken down by domain |
| B1 Platform summary | [Monte Carlo Data Reliability Dashboard](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | reliability over time: incidents, time to resolve, breakdown by domain |
| B2 Domain ranking | [Purview: data health by governance domain](https://learn.microsoft.com/en-us/purview/unified-catalog-reports-data-governance) | controls for each domain side by side |
| B2 Domain ranking | [OpsLevel Rubric](https://docs.opslevel.com/docs/categories-and-levels) | maturity levels by team in one table |
| B3 Problem registry | [Monte Carlo](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | incidents prioritized by impact on data products |
| B3 Problem registry | [Euno](https://euno.ai/) | dashboard usage is propagated up the lineage to tables: priority by real consumption |
| B4 My factories | [Backstage](https://backstage.io/docs/features/software-catalog/) | "Owned by me" filter in the catalog |
| B4 My factories | [Cortex Scorecards](https://docs.cortex.io/standardize/scorecards) | a personal list of entities with their level |

## C. Domain cabinet

| Block | Reference | What we take |
|---|---|---|
| C1 Domain indicators | [Atlan: Monitor data domains](https://docs.atlan.com/product/capabilities/data-products/how-tos/monitor-data-domains) | domain statistics: products, enrichment, usage |
| C1 Domain indicators | [Purview](https://learn.microsoft.com/en-us/purview/unified-catalog-reports-data-governance) | a short set of controls per domain |
| C2 Subdomain cards | [Cortex Scorecards](https://docs.cortex.io/standardize/scorecards) | entity card with its level and failing rules |
| C2 Subdomain cards | [Spotify Soundcheck Track Insights](https://backstage.spotify.com/docs/plugins/soundcheck/core-concepts/track-insights) | share of certified entities by level |

## D. Subdomain cabinet

| Block | Reference | What we take |
|---|---|---|
| D1 Subdomain header | [Backstage Entity Overview](https://backstage.io/docs/features/software-catalog/) | owner, lifecycle, tags and links in one card |
| D1 Subdomain header | [Sifflet Data Products](https://docs.siffletdata.com/docs/data-products) | product status, owners and SLA next to the name |
| D2 Self-service AI | [Databricks Genie Benchmarks](https://www.databricks.com/blog/operationalizing-genie-ontology-your-data-stack) | benchmark questions kept apart from the model context, a run after every change |
| D2 Self-service AI | [Snowflake Cortex Analyst Evaluations](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst-evaluations) | verified queries as a benchmark, regression metrics |
| D3 Semantic Layer metrics | [dbt Explorer](https://docs.getdbt.com/docs/explore/explore-projects) | health, freshness and usage of models and metrics in one list |
| D3 Semantic Layer metrics | [Snowflake Verified Queries](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst/analyst-optimization) | verified queries as the trusted layer for AI answers |
| D4 Data marts | [Monte Carlo Table Health](https://www.montecarlodata.com/blog-introducing-table-health-dashboard-a-better-way-to-track-data-quality-coverage-at-scale/) | monitoring coverage and table health at scale |
| D4 Data marts | [DataHub Data Health](https://docs.datahub.com/docs/managed-datahub/observe/data-health-dashboard) | a table with status dots by check type |
| D5 Dashboards | [Euno](https://euno.ai/) | BI certification rules |
| D5 Dashboards | [Power BI Endorsement](https://learn.microsoft.com/en-ie/power-bi/collaborate-share/service-endorsement-overview) | promoted and certified content |
| D6 Good output | [Airbnb Data Quality Score](https://medium.com/airbnb-engineering/data-quality-score-the-next-chapter-of-data-quality-at-airbnb-851dccda19c3) | 0–100 from four components, each lost point has a concrete hint |
| D6 Good output | [Elementary Data Health](https://docs.elementary-data.com/cloud/features/collaboration-and-communication/data-health) | a weighted index with configurable color thresholds |
| D7 Factory staff | [Backstage Ownership](https://backstage.io/docs/features/software-catalog/) | every entity must have an owner |
| D7 Factory staff | [DataHub Compliance Forms](https://docs.datahub.com/docs/api/tutorials/forms) | required ownership fields with completion share by domain |
| D8 Tasks with points | [Cortex Scorecards](https://docs.cortex.io/standardize/scorecards) | levels or weighted points, gamification as a stated goal |
| D8 Tasks with points | [OpsLevel Campaigns](https://docs.opslevel.com/docs/categories-and-levels) | a deadline by which teams must reach a level |
| D9 Object card | [Sifflet Asset page](https://docs.siffletdata.com/docs/data-products) | status by monitors and incidents, "Not monitored" shown separately |
| D9 Object card | [Airbnb DQ Score](https://medium.com/airbnb-engineering/data-quality-score-the-next-chapter-of-data-quality-at-airbnb-851dccda19c3) | "what to do" hints under each component |
| D10 Glossary as a knowledge graph | [DataHub Business Glossary](https://docs.datahub.com/docs/glossary/business-glossary) | Inherits and Contains relations, the term page shows objects tagged with child terms; glossary as YAML |
| D10 Glossary as a knowledge graph | [Atlan Glossary](https://docs.atlan.com/product/capabilities/governance/glossary/how-tos/automate-term-asset-links) | term profile with linked assets and automatic term-to-column linking with review of suggestions |

## E. 3D modes

| Block | Reference | What we take |
|---|---|---|
| E1 Factory map | [ExplorViz](https://github.com/ExplorViz-Archive/ExplorViz) | a live software landscape in three.js with heat maps; the closest technical analogue |
| E1 Factory map | [Factorio](https://factorio.com) | map view: the whole base with state colors |
| E2 Hover card | [Factorio](https://factorio.com) | entity tooltip: everything about a building without a click |
| E2 Hover card | [Cities: Skylines](https://skylines.paradoxwikis.com/Zoning) | a building info panel with key indicators and a path to details |
| E3 Subdomain factory | [Factorio](https://factorio.com) | belts, throughput, visible idling and jams |
| E3 Subdomain factory | [Celonis Process Explorer](https://www.celonis.com/) | a flow with deviations and a choice of detail level |
| E4 Zone markings and indicators on the ground | [ISA-101](https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards) | the standard for operator interfaces in industry: muted background, color only for deviations, grouping by zones |
| E4 Zone markings and indicators on the ground | [Cities: Skylines](https://skylines.paradoxwikis.com/Zoning) | zones painted right on the ground |
| E5 Characters: director and staff | [The Sims](https://sims.fandom.com/wiki/Plumbob) | a mood indicator above the head, clear without a label |
| E5 Characters: director and staff | [Two Point Hospital](https://www.twopointhospital.com) | staff by role and visible vacancies |
| E6 Shipping to the city | [Factorio](https://factorio.com) | logistics as a visible flow |
| E6 Shipping to the city | [Mini Metro](https://dinopoloclub.com/games/mini-metro/) | a minimal flow diagram readable at a glance |
| E7 Object links | [Monte Carlo: lineage and root cause](https://www.montecarlodata.com/blog-ai-data-lineage/) | a graph around one object: from a broken dashboard to the topmost unhealthy table |
| E7 Object links | [DataHub Lineage](https://docs.datahub.com/docs/features/feature-guides/lineage) | sources on the left, consumers on the right, step-by-step expansion |
| E7 Object links | [Neo4j Bloom: scene interactions](https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/) | start from one node and expand neighbors by click |
| E7 Object links | [Snowflake Cost Management](https://docs.snowflake.com/en/user-guide/cost-exploring-overall) | spend by object and query, finding the expensive and the unused |
| E8 Insight Factories world | [Cities: Skylines](https://www.paradoxinteractive.com/games/cities-skylines/about) | industrial zones, roads and freight flowing to the consumer |
| E8 Insight Factories world | [Factorio](https://factorio.com) | logistics between production sites as a visible network |

## F. Cross-cutting data

| Block | Reference | What we take |
|---|---|---|
| F1 Status and color model | [Sifflet](https://docs.siffletdata.com/docs/data-products) | Healthy / At Risk / Critical and a separate "Not monitored" |
| F1 Status and color model | [ISA-101](https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards) | color only for deviations |
| F2 Indicator trends | [Spotify Soundcheck](https://backstage.spotify.com/docs/plugins/soundcheck/core-concepts/track-insights) | current state plus a historical trend by level |
| F2 Indicator trends | [Monte Carlo](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | trends of incidents and time to resolve |
| F3 Infrastructure cost | [Datadog Cloud Cost Management](https://docs.datadoghq.com/cloud_cost_management/) | cost per team and per unit of output |
| F3 Infrastructure cost | [Snowflake Cost Management](https://docs.snowflake.com/en/user-guide/cost-exploring-overall) | spend by object and query |
| F4 Provenance labels | [Our World in Data](https://ourworldindata.org) | source and date under every chart |
| F4 Provenance labels | [Atlan Trust Signals](https://docs.atlan.com/product/capabilities/governance/data-quality/concepts/data-quality-studio) | trust badges next to the data |

## G. Operations and engagement

| Block | Reference | What we take |
|---|---|---|
| G1 Freshness and SLA | [Uber Databook](https://www.uber.com/us/en/blog/operational-excellence-data-quality/) | dataset tiers and freshness SLAs |
| G1 Freshness and SLA | [Monte Carlo](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | freshness as a separate reliability signal |
| G2 Data quality incidents | [Sifflet](https://docs.siffletdata.com/docs/data-products) | product status from the severity of open incidents, alerts on status change |
| G2 Data quality incidents | [DataHub Data Health](https://docs.datahub.com/docs/managed-datahub/observe/data-health-dashboard) | an incidents tab |
| G3 Blast radius | [Monte Carlo Data Products](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | a product is assembled from a dashboard up the lineage |
| G3 Blast radius | [Masthead](https://docs.mastheadata.com/) | lineage down to BI and alerts to the affected |
| G4 AI-Ready score and levels L0–L4 | [OpsLevel](https://docs.opslevel.com/docs/categories-and-levels) | levels in strict order with conditions for the next level |
| G4 AI-Ready score and levels L0–L4 | [Cortex Scorecards](https://docs.cortex.io/standardize/scorecards) | rules grouped into levels with progress per entity |
| G5 Weekly digest | [Sifflet](https://docs.siffletdata.com/docs/data-products) | alerts only on status change and scheduled summaries |
| G5 Weekly digest | [DataHub Actions](https://docs.datahub.com/docs/api/tutorials/forms) | catalog events to Slack, Teams, webhooks |

## All reference products

| Product | Used in |
|---|---|
| [Factorio](https://factorio.com) | A3, E1, E2, E3, E6, E8 |
| [Cortex Scorecards](https://docs.cortex.io/standardize/scorecards) | B4, C2, D8, G4 |
| [Cities: Skylines](https://skylines.paradoxwikis.com/Zoning) | E2, E4, E8 |
| [Monte Carlo](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | B3, F2, G1 |
| [Sifflet](https://docs.siffletdata.com/docs/data-products) | F1, G2, G5 |
| [Celonis Process Explorer](https://www.celonis.com/) | A3, E3 |
| [DataHub Data Health](https://docs.datahub.com/docs/managed-datahub/observe/data-health-dashboard) | D4, G2 |
| [Euno](https://euno.ai/) | B3, D5 |
| [ISA-101](https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards) | E4, F1 |
| [Linear](https://linear.app) | A1, A2 |
| [Snowflake Cost Management](https://docs.snowflake.com/en/user-guide/cost-exploring-overall) | E7, F3 |
| [Airbnb Data Quality Score](https://medium.com/airbnb-engineering/data-quality-score-the-next-chapter-of-data-quality-at-airbnb-851dccda19c3) | D6 |
| [Airbnb DQ Score](https://medium.com/airbnb-engineering/data-quality-score-the-next-chapter-of-data-quality-at-airbnb-851dccda19c3) | D9 |
| [Atlan Glossary](https://docs.atlan.com/product/capabilities/governance/glossary/how-tos/automate-term-asset-links) | D10 |
| [Atlan Trust Signals](https://docs.atlan.com/product/capabilities/governance/data-quality/concepts/data-quality-studio) | F4 |
| [Atlan: Monitor data domains](https://docs.atlan.com/product/capabilities/data-products/how-tos/monitor-data-domains) | C1 |
| [Backstage](https://backstage.io/docs/features/software-catalog/) | B4 |
| [Backstage Entity Overview](https://backstage.io/docs/features/software-catalog/) | D1 |
| [Backstage Ownership](https://backstage.io/docs/features/software-catalog/) | D7 |
| [Backstage Software Catalog](https://backstage.io/docs/features/software-catalog/) | A1 |
| [Databricks Genie Benchmarks](https://www.databricks.com/blog/operationalizing-genie-ontology-your-data-stack) | D2 |
| [Datadog Cloud Cost Management](https://docs.datadoghq.com/cloud_cost_management/) | F3 |
| [DataHub](https://datahub.com/products/) | A2 |
| [DataHub Actions](https://docs.datahub.com/docs/api/tutorials/forms) | G5 |
| [DataHub Business Glossary](https://docs.datahub.com/docs/glossary/business-glossary) | D10 |
| [DataHub Compliance Forms](https://docs.datahub.com/docs/api/tutorials/forms) | D7 |
| [DataHub Lineage](https://docs.datahub.com/docs/features/feature-guides/lineage) | E7 |
| [dbt Explorer](https://docs.getdbt.com/docs/explore/explore-projects) | D3 |
| [Elementary Data Health](https://docs.elementary-data.com/cloud/features/collaboration-and-communication/data-health) | D6 |
| [ExplorViz](https://github.com/ExplorViz-Archive/ExplorViz) | E1 |
| [Masthead](https://docs.mastheadata.com/) | G3 |
| [Microsoft Purview Data Governance Report](https://learn.microsoft.com/en-us/purview/unified-catalog-reports-data-governance) | B1 |
| [Mini Metro](https://dinopoloclub.com/games/mini-metro/) | E6 |
| [Monte Carlo Data Products](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | G3 |
| [Monte Carlo Data Reliability Dashboard](https://docs.getmontecarlo.com/docs/using-data-product-dashboards) | B1 |
| [Monte Carlo Table Health](https://www.montecarlodata.com/blog-introducing-table-health-dashboard-a-better-way-to-track-data-quality-coverage-at-scale/) | D4 |
| [Monte Carlo: lineage and root cause](https://www.montecarlodata.com/blog-ai-data-lineage/) | E7 |
| [Neo4j Bloom: scene interactions](https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/) | E7 |
| [OpsLevel](https://docs.opslevel.com/docs/categories-and-levels) | G4 |
| [OpsLevel Campaigns](https://docs.opslevel.com/docs/categories-and-levels) | D8 |
| [OpsLevel Rubric](https://docs.opslevel.com/docs/categories-and-levels) | B2 |
| [Our World in Data](https://ourworldindata.org) | F4 |
| [Power BI Endorsement](https://learn.microsoft.com/en-ie/power-bi/collaborate-share/service-endorsement-overview) | D5 |
| [Purview](https://learn.microsoft.com/en-us/purview/unified-catalog-reports-data-governance) | C1 |
| [Purview: data health by governance domain](https://learn.microsoft.com/en-us/purview/unified-catalog-reports-data-governance) | B2 |
| [Sifflet Asset page](https://docs.siffletdata.com/docs/data-products) | D9 |
| [Sifflet Data Products](https://docs.siffletdata.com/docs/data-products) | D1 |
| [Snowflake Cortex Analyst Evaluations](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst-evaluations) | D2 |
| [Snowflake Verified Queries](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst/analyst-optimization) | D3 |
| [Spotify Soundcheck](https://backstage.spotify.com/docs/plugins/soundcheck/core-concepts/track-insights) | F2 |
| [Spotify Soundcheck Track Insights](https://backstage.spotify.com/docs/plugins/soundcheck/core-concepts/track-insights) | C2 |
| [The Sims](https://sims.fandom.com/wiki/Plumbob) | E5 |
| [Two Point Hospital](https://www.twopointhospital.com) | E5 |
| [Uber Databook](https://www.uber.com/us/en/blog/operational-excellence-data-quality/) | G1 |
