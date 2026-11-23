# Glossary as a knowledge graph — design of the subdomain tab

Design note for block D10 of the [functional blocks spec](functional-blocks.md). The demo implements the tab on sample data; this note describes the full feature.

## TL;DR

The "Glossary" tab in the subdomain cabinet shows the domain's business terms and their links to Semantic Layer metrics and dimensions, data marts and columns in the Data Catalog, and the Wiki pages each term comes from. Candidate terms are extracted by an LLM from selected Wiki spaces; every candidate carries a quote with a link to the page. A term enters the glossary only after review by the BI partner; links from a term to a metric are also confirmed by the metrics curator. The graph opens in focus mode on one term (neighbors 1–2 steps away), because the full subdomain graph in the links window (E7) read poorly. Only approved terms count toward 1.4 Domain knowledge of the AI-Ready score.

The key question before building it: where the glossary lives. Under principle 1 the portal shows state and does not change it, and a semantic model of the domain (with synonyms) may already be planned in the Control Plane. Storage options are below.

---

## References

| Product | What we take | Data model | Link |
|---|---|---|---|
| DataHub Business Glossary | Term groups as folders; Inherits (is-a) and Contains (has-a) relations; the parent term page shows objects tagged with child terms; glossary as YAML in git, loaded by ingestion | GlossaryNode → GlossaryTerm, `glossaryRelatedTerms` aspect (isA, hasA, related, values) | [docs](https://docs.datahub.com/docs/glossary/business-glossary), [GlossaryTerm](https://docs.datahub.com/docs/generated/metamodel/entities/glossaryterm) |
| Atlan Glossary | Term profile: README, synonyms, related terms, a linked assets tab; an app that links terms to columns by name and filter; AI descriptions with accept / reject / edit | Glossary → Category → Term; term ↔ asset (many-to-many) | [concept](https://docs.atlan.com/product/capabilities/governance/glossary/concepts/what-is-a-glossary), [auto-linking](https://docs.atlan.com/product/capabilities/governance/glossary/how-tos/automate-term-asset-links) |
| Collibra Business Glossary | Import → Improve → Review lifecycle: bulk imports get the Candidate status, stewards clean them up, then approval; a Stakeholder role votes without edit rights | Business Term, Acronym, KPI; complex relations with attributes | [Business Glossary](https://productresources.collibra.com/docs/collibra/latest/Content/BusinessGlossary/to_business-glossary.htm) |
| Microsoft Purview Unified Catalog | Terms live in a governance domain; publishing through a "Term publish" workflow (draft → published); advice to publish early and improve later | Governance domain → glossary term (draft / published) | [workflows](https://learn.microsoft.com/en-us/purview/unified-catalog-workflows) |
| OpenMetadata | Reviewers at the glossary level; a new term is a Draft plus a task for the reviewer; Approved / Rejected; auto-approval without reviewers (we do not take this) | Glossary → GlossaryTerm (synonyms, relatedTerms, references, reviewers, status) | [approval](https://docs.open-metadata.org/v2.0.x/how-to-guides/data-governance/glossary/approval) |
| Alation | Trust flags (endorsed / warning / deprecated) at the point of use; AI-suggested descriptions with bulk accept; a "suggested by a bot" badge | Glossary as a catalog object, term ↔ object | [Glossary](https://www.alation.com/docs/en/latest/welcome/Glossary/index.html) |
| Databricks Unity Catalog business semantics | Glossary, domains and metric views in one layer for people and agents; synonyms and display names on metrics and dimensions; access through SQL, API, MCP | Metric view (measures, dimensions) + glossary + domains | [business semantics](https://learn.microsoft.com/en-us/azure/databricks/business-semantics/) |
| Microsoft Fabric IQ Ontology | A business concept is bound to tables and columns (data binding); an entity can have several bindings | Entity type, property, relationship type, binding | [overview](https://learn.microsoft.com/en-us/fabric/iq/overview) |
| dbt Semantic Layer / MetricFlow | Entities and dimensions are declared on model columns — a direct "concept → column" link in code | semantic model: entities, dimensions, metrics | [semantic models](https://docs.getdbt.com/docs/build/semantic-models) |
| Cube | Two context channels: `description` for people and agents, `meta.ai_context` for agents only (synonyms, abbreviations) | cube / view, member description, meta | [AI context](https://docs.cube.dev/docs/data-modeling/ai-context) |
| Looker LookML | `description`, `label`, `group_label` on fields as a business layer over columns | view → dimension / measure | [LookML](https://cloud.google.com/looker/docs/what-is-lookml) |
| Stardog Knowledge Catalog | An ontology over data without copying it; concept-to-column mapping; grow the model in parts instead of a "super-ontology" | RDF/OWL, DCAT | [Knowledge Catalog](https://docs.stardog.com/knowledge-catalog/) |
| SKOS (W3C) | A standard vocabulary for thesauri: prefLabel / altLabel / hiddenLabel, definition, scopeNote, broader / narrower / related, exactMatch / closeMatch | Concept, ConceptScheme, Collection | [SKOS Reference](https://www.w3.org/TR/skos-reference/) |
| Glean Enterprise Graph | A "content — people — activity" graph searched together with vectors; document permissions are inherited | Documents, people, teams, activity | [Knowledge Graph](https://docs.glean.com/security/knowledge-graph) |
| Microsoft GraphRAG | Entities and relations extracted per chunk, then descriptions of one entity from many chunks merged into one | entities, relationships, text units, communities | [methods](https://microsoft.github.io/graphrag/index/methods/) |
| LlamaIndex PropertyGraphIndex | `SchemaLLMPathExtractor`: allowed node and relation types and triples are set by a schema and the output is validated; a chunk links to an entity with a MENTIONS edge | property graph + chunk nodes | [guide](https://developers.llamaindex.ai/python/framework/module_guides/indexing/lpg_index_guide/) |
| Neo4j LLM Knowledge Graph Builder | Duplicate entities from different chunks are found by embeddings and merged by a person; links move to the surviving node | entity + chunk edges | [entity resolution](https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_kg_builder.html) |
| Neo4j Bloom (also in E7) | Focus mode and neighbor expansion by click, node size by importance | — | [Bloom](https://neo4j.com/product/bloom/) |

What we take overall:
- relation model — SKOS plus typed "term → object" links as in Fabric IQ (binding) and dbt (concept on a column);
- lifecycle — Collibra (imports arrive as candidates) and OpenMetadata (reviewer, task, Approved / Rejected), without auto-approval;
- extraction — the LlamaIndex schema, GraphRAG description merging, human merging of duplicates as in the Neo4j builder;
- agent channel — Cube (a description for people kept apart from agent hints) and Unity Catalog (synonyms on metrics and dimensions, access through MCP);
- UX — the Atlan term profile with a linked assets tab, Alation trust flags as status badges.

---

## Architecture

```
Wiki (spaces and page trees of the subdomain)
   │  incremental by page version
   ▼
[1] Collect and chunk ──► [2] LLM extraction by schema ──► [3] Quote check
                                                             │
                                                             ▼
Semantic Layer (metrics, dimensions) ─┐            [4] Normalize and merge candidates
Data Catalog (data marts, columns)    ├──► [5] Link to objects (name + embeddings + LLM rerank)
Health score (usage)                  ┘                      │
                                                             ▼
                                          Glossary store (terms, links, revisions, sources)
                                             │                  │                 │
                                     "Glossary" tab       API / agent tools    Quality metrics → 1.4
                                     (view, review)       (resolve, lookup, graph)
```

Components:
1. **Wiki connector** — reads pages from the subdomain's source list, keeps `page_id` and `version`, reprocesses only changed pages.
2. **Extractor** — an LLM with a strict JSON output schema, one call per chunk.
3. **Quote check** — the quote from the LLM answer is searched in the chunk text (fuzzy match ≥ 0.9); a candidate without a found quote is dropped.
4. **Merger** — joins the same term from different pages, builds one definition with links to all sources, flags contradictions.
5. **Linker** — suggests links to Semantic Layer metrics and dimensions, data marts and columns.
6. **Store and API** — options below.
7. **Portal** — the "Glossary" tab, the review queue, quality indicators for 1.4.

---

## Data model

The base is SKOS: a term is a `skos:Concept`, a subdomain glossary is a `skos:ConceptScheme`. On top of SKOS are typed links to objects and mandatory provenance for every term and every link.

### Entities

| Entity | Fields | Comment |
|---|---|---|
| `scheme` (glossary) | id, l1, l2, owner (BI partner), reviewers, sources[] | one per subdomain; a company-wide glossary is a separate scheme |
| `term` | id (stable slug), scheme_id, pref_label, alt_labels[], hidden_labels[], abbr[], definition, scope_note, example, formula_text, owner, status, criticality (key / normal), created_at, updated_at, approved_at, approved_by, rev | `alt_labels` are synonyms; `hidden_labels` are typos and variants for agent search, not shown |
| `term_rev` | term_id, rev, diff, author, reason, at | edit history, append only |
| `edge` | id, src, dst, type, status, confidence, origin, evidence[], created_by, reviewed_by, at | "term — term" and "term — object" links in one table |
| `asset_ref` | kind (metric / dimension / datamart / column / dashboard / doc), ext_id, name, sub, url, health_snapshot | a reference to an object in another tool; the portal keeps the key, not a copy |
| `source` | id, kind (wiki / manual / import), page_id, page_version, space, title, url, author, updated_at, restricted | a page or another source |
| `evidence` | source_id, chunk_id, quote (≤ 300 characters), char_span, extractor (model, prompt version), extracted_at | the quote a term, definition or link rests on |
| `task` | id, kind (approve_term, approve_link, merge, conflict, stale), target, assignee_role, status, comments[] | review queue |

### Link types

| Type | Between | SKOS / analogue | Example |
|---|---|---|---|
| `synonym` | term ↔ term | `skos:exactMatch` across schemes; inside a scheme, merged into `alt_labels` | "Buyer" = "Shopper" |
| `broader` / `narrower` | term → term | `skos:broader` | "Promoted listing" → "Listing" |
| `related` | term ↔ term | `skos:related` | "Contact" — "Listing view" |
| `depends_on` | term → term | own extension | "Contact conversion" depends on "Contact" and "Listing view" |
| `part_of` | term → term | DataHub hasA | "Address" contains "Region" |
| `measured_by` | term → metric | Fabric IQ binding | "Active buyer" → `buyers_active_dau` |
| `sliced_by` / `is_dimension` | term → dimension | — | "Category" → dimension `category` |
| `stored_in` | term → column | dbt: concept on a column | "Category" → `item_stats.category_id` |
| `grain_of` | term → data mart | — | "Listing" is the grain of `listings_daily` |
| `described_in` | term → Wiki page | `skos:note` + link | definition from the "Clinics glossary" page |
| `close_match` | term → term of another scheme | `skos:closeMatch` | "Referral" in Clinics ≈ "Referral" in Marketing, with different definitions |

### Term statuses

```
candidate ──(BI partner: accept)──► approved ──(definition edit)──► in_review ──► approved
    │                                  │
    ├──(reject)──► rejected            ├──(source changed / 180 days without review)──► stale ──► approved
    └──(merge)──► merged → target      └──(retire)──► deprecated (with a replacement)
manual (created by hand) ──► in_review ──► approved
```

- `candidate` — extracted by the LLM, not reviewed; visible only in review mode and in the API with `include_candidates`.
- `in_review` — created or edited by a person, waiting for a reviewer; for a manual term the reviewer is a second person (the BI partner if someone else created it, otherwise the metrics curator or the data owner).
- `approved` — confirmed; only these are visible to agents by default and count toward 1.4.
- `stale` — approved, but the source changed after approval or 180 days passed without review; stays visible with a warning.
- `deprecated` — retired, with a mandatory `replaced_by`; the agent receives the replacement.
- `rejected`, `merged` — history, hidden in the list.

A link has its own statuses: `suggested` (from the linker), `approved`, `rejected`. An approved term can have unreviewed links; the card shows them separately.

### Provenance and versions

- Every definition field and every link has an `origin`: `llm` (model, prompt version), `manual` (author), `import` (existing Knowledge Base entries, Data Catalog).
- A definition accepted from the LLM without edits is marked "accepted from the Wiki unchanged"; after a manual edit it becomes `manual` with a link to the original quote.
- Revisions in `term_rev` are append only. A new extraction run does not overwrite an approved term; it creates a `conflict` or `stale` task if the new definition differs in meaning.
- The glossary snapshot is versioned together with the portal snapshot (the date in the provenance label, principle F4).

---

## Pipeline from the Wiki

### 1. Choosing sources
- The BI partner sets the subdomain's list: spaces, root pages of page trees, labels (`glossary`, `metrics`), exclusions (archives, meeting notes older than a year).
- By default the pipeline suggests pages that already mention the subdomain's metrics or data marts, and pages with "Term | Definition" tables.
- Restricted pages are not processed in the first version: a quote from a closed page in the glossary would reveal its content. Later, with inherited permissions as in Glean.

### 2. Preparing and chunking
- Page storage format → markdown; tables stay tables, embedded widgets become links with ids.
- A chunk is a section by headings, 600–1200 tokens, starting with a breadcrumb "Space / Page / Section"; glossary tables are not split.
- A pre-filter without an LLM: definition patterns ("is", "we define", "we count", "definition", a table with a "definition" column), mentions of metric and column names. Chunks without signals are skipped; this cuts the number of calls several times.

### 3. Extraction
A strict schema, as in `SchemaLLMPathExtractor`: allowed link types and triples are set in advance, the output is JSON, unknown types are dropped.

Prompt sketch:

```
You extract business terms of the domain "{l1} / {l2}" from a fragment of company documentation.
A term is a concept used in the business and analytics of the domain: an entity (listing, buyer),
an event (contact, order), an indicator (contact conversion), an attribute (category, region).
Do not extract names of teams, people, systems, tickets, or common words without a special meaning in the domain.

For each term return:
- term: canonical name in the singular, as in the text
- aliases: synonyms and abbreviations present in this fragment
- definition: a definition in your own words, at most 2 sentences, based only on this fragment
- definition_kind: explicit (the text defines it) | inferred (meaning derived from context)
- quote: a verbatim quote from the fragment that supports the definition (up to 300 characters)
- mentions: metrics, tables, columns mentioned with the term, verbatim
- relations: [{type: broader|narrower|related|depends_on|part_of|synonym, target, quote}]
- confidence: 0..1

If the text has no definition, definition_kind = inferred and confidence is at most 0.5.
Invent nothing beyond the fragment. Answer with JSON by the schema.

Context: {breadcrumb}
Known glossary terms (for consistent naming): {top_terms}
Fragment:
{chunk}
```

- The list of known terms keeps the LLM naming one concept the same way across chunks.
- Model and prompt version are written to `evidence.extractor`; a prompt change means a new run on a reference sample of pages.

### 4. Quote check
- The quote is searched in the chunk text; below the threshold the candidate is dropped and logged.
- For `relations` a quote is required just as for the definition.

### 5. Normalization and merging
- Name normalization: lower case, lemmatization, expansion of abbreviations from the subdomain dictionary.
- Merging in three steps:
  1. exact match of the normalized name or a synonym — one candidate;
  2. embedding similarity of "name + definition" ≥ 0.88 — the pair goes to an LLM judge: "same concept / different concepts / one is broader";
  3. "broader" becomes a `broader` link, "same" becomes a merge, "different" keeps the pair apart with a "similar names" note.
- Definitions are merged as in GraphRAG: one definition is assembled from all quotes, with all sources attached.
- A contradiction (two explicit definitions the judge finds incompatible) is not merged: a `conflict` task is created with both quotes. This is common for terms like "active user", and the disagreement itself is useful to the business.
- A candidate similar to a term of a neighboring subdomain gets a `close_match` link (as a candidate) and is not merged: subdomains may understand a term differently.

### 6. Confidence
The final candidate confidence is a weighted sum; weights are fitted on a labeled sample.

| Signal | Contribution |
|---|---|
| definition_kind = explicit | high |
| number of independent source pages | high |
| the page is marked official (`glossary` label, a "Glossary" section, a page by the BI partner) | medium |
| page freshness (edited within the last year) | medium |
| the term is mentioned next to a metric or data mart of the subdomain | medium |
| confidence from the LLM answer | low |

Thresholds: ≥ 0.75 — strong candidate, top of the queue; 0.4–0.75 — regular; < 0.4 — hidden, available through a filter.

### 7. Linking to metrics and columns
Link candidates are built for approved terms and strong candidates.
- **Candidate generation:**
  - a term name or synonym matches the name, display name or description of a metric or dimension in the Semantic Layer;
  - a metric or table is mentioned in the same chunk where the term is defined (the strongest signal — the page author made it);
  - embedding similarity between the term definition and the metric or column description, top 20;
  - the column search space is the subdomain's data marts and the data marts its dashboards and metrics read, not the whole warehouse.
- **Rerank:** the LLM gets the term, the definition and up to 10 candidates with descriptions, and chooses a link type (`measured_by`, `sliced_by`, `stored_in`, `grain_of`) or "no link".
- **Display priority:** metrics and columns with usage above zero, key metrics first.
- All such links are `suggested` until reviewed; a link to a metric is confirmed by the metrics curator, a link to a column by the BI partner or the data mart owner.

### 8. Schedule and cost
- A full run per subdomain when sources are connected; then daily on changed pages.
- Estimate for one subdomain: 200–800 pages, 30–40% of chunks reach the LLM after the pre-filter. Exact numbers come after a pilot and depend on the chosen model and quota.

---

## Manual curation and review

### Roles

| Role | What they do in the glossary | Rights |
|---|---|---|
| BI partner (production manager) | owns the subdomain glossary: accepts and rejects candidates, edits definitions, merges duplicates, chooses Wiki sources | create, edit, approve a term; approve a link to a column or data mart |
| Metrics curator | confirms "term → metric / dimension" links, keeps the term definition consistent with the metric description in the Semantic Layer | approve a link to the Semantic Layer; return a term for rework |
| Data owner | approves the business definition of key terms (criticality = key); an "approved by the business" badge | a vote in the task, no edit rights (as the Collibra Stakeholder) |
| AI champion, domain analysts | suggest terms and edits, comment | create a `manual` term in `in_review`, suggest an edit |
| Data mart owner | confirms a term's link to a column of their data mart if the BI partner is unsure | approve a link to a column |

### Scenarios
1. **Reviewing candidates.** The "In review" queue is sorted by confidence and by usage of linked metrics. Card actions: "Accept", "Accept with edit", "Merge with…", "Reject" (reason required: not a term, duplicate, wrong, outdated). Keyboard shortcuts A / E / M / R for batch review.
2. **Creating by hand.** Form: name, synonyms, definition, example, source link (a Wiki page or "expert knowledge" with the author), links. A source link is required for key terms.
3. **Merging.** Choose the target term and preview which synonyms, quotes and links move. The source term gets the `merged` status and its id resolves to the target (agents do not break).
4. **Definition conflict.** Two quotes side by side; options: keep one, write a common one, split into two terms with `close_match`.
5. **Staleness.** If the source page of an approved term changes, a `stale` task is created with a diff of the quote; the BI partner confirms "still valid" or edits.
6. **Retiring.** `deprecated` only with `replaced_by` or a "concept no longer used" comment.

### Rules
- No auto-approval: an LLM candidate without review is not visible to agents by default and does not count toward 1.4.
- An edit to an approved term becomes visible after review, except typos (an edit without a change of meaning has a "minor edit" flag and needs no review).
- Every action writes to `term_rev` and to the card's feed.
- Notifications go through the weekly digest (G5): "12 new candidates, 2 conflicts, 3 stale terms"; at most once a week.

### Storage options

Principle 1 of the spec: the portal shows state and does not change it; the only exception is the Domain Registry. A glossary with editing in the portal would be a second exception. Hence three options.

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Git: the domain's Knowledge Base repository** | The glossary is YAML files in the domain's Knowledge Base repository (`glossary/terms/*.yaml` in the DataHub format, SKOS fields). The pipeline opens a pull request with candidates, review is code review, the portal reads the files and shows the graph, buttons lead to Git | review, history and provenance for free; Knowledge Base skills read the glossary without a new API; lives next to FAQ and text-to-SQL examples; principle 1 holds | pull request review is awkward for data owners and for hundreds of candidates; the graph and auto-links need a build step; conflicts on bulk edits |
| **B. Glossary service (Postgres + API), UI in the portal** | Tables from the data model section; the graph is edges in the same database (recursive queries over 2–3 steps are enough); the portal has a curation screen like the Domain Registry (C10); scheduled export to the Knowledge Base repository | convenient queue review and merging in the UI; one entry point for agent APIs; statuses and quality metrics are a query away | a second exception to principle 1; an own service with permissions and backups; risk of one more source of semantics next to the Semantic Layer and the Control Plane |
| **C. An entity in the Control Plane or the Data Catalog** | The glossary is part of the domain's semantic model in the Control Plane, or a new Data Catalog entity next to column descriptions; the portal reads and shows it | no extra source of semantics; links to columns live where the columns live | depends on another team's scope and timing; extraction and review must be designed with them |

Suggested path: in the demo, sample data generated in the page with a "sample" label; for a pilot, A or B; agree on the target state with the Control Plane owners before B is built.

A graph database is not needed in any option: there are hundreds of terms per subdomain, thousands of links, and traversals are short.

---

## Link to the semantic and physical layers

Three graph layers, one term at the crossing:

```
          business layer             semantic layer                    physical layer (Data Catalog, warehouse)
   ┌───────────────────┐  measured_by  ┌──────────────────────┐  source  ┌───────────────────────────┐
   │ term              │──────────────►│ metric               │─────────►│ metric source → data mart │
   │ "Active buyer"    │  sliced_by    │ buyers_active_dau    │          │ buyer_stream              │
   │                   │──────────────►│ dimension category   │          └──────────┬────────────────┘
   └──┬────────────┬───┘               └──────────────────────┘                     │ columns
      │ broader    │ stored_in                                                       ▼
      ▼            └─────────────────────────────────────────────────────► buyer_stream.is_active
   "Buyer"
      │ described_in
      ▼
   Wiki: "Clinics glossary", section 2
```

- **Term → metric.** The main link for agents: the question "how many active buyers" resolves to a term, the term to an approved metric. The metric card in the portal (D3, D9) gets a "Terms: …" line.
- **Term → dimension.** Attributes (category, region, platform) are dimensions; the agent uses them as filters and breakdowns.
- **Term → column and data mart.** For text-to-SQL without the Semantic Layer: which columns mean the concept, which data mart has the right grain. The "metric → source → data mart" chain is already built in the links window (E7); the glossary adds a second, meaning-based path to the data mart.
- **Definition mismatch.** If the approved term definition and the description of the linked metric disagree (an LLM comparison when the link is approved), a task goes to the metrics curator. The metric definition stays in the Semantic Layer as the single source of truth; the glossary links to it and does not copy the formula.
- **Health.** Linked objects show their health status (F1). A term whose metrics are all unhealthy gets a "the concept exists, no reliable calculation" warning — a direct entry into the subdomain's tasks.

---

## UX and wireframes

### Place in the portal
- The "Glossary" tab in the subdomain cabinet after the metrics tab: `Overview · AI-Ready Score · Self-service AI · Metrics · Glossary · Data marts · Dashboards · Reliability · Infracost`. The counter shows approved terms; with a queue, a gray "+12 in review" badge next to it.
- Address: `#/s/<i>/gl`, a term is `#/s/<i>/gl/<term_id>`, review mode is `#/s/<i>/gl?review=1`.
- Visuals follow the demo tokens (`app/theme.css`): health colors (F1) only on metrics, data marts and columns; on terms color means status, not health. The game accent color is not used here.

### Layout
Three columns, as in the links window: the list on the left, the graph in the center, the card on the right. Below 1280 px the graph moves to a "Graph" tab above the list and the card opens on top.

### Wireframe 1. Tab: list, focus graph, card

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Overview / Clinics / Primary Care                                           [Cabinet] [Factory] [Links]            │
│ Buyers   Health 71% ▲3    AI-Ready L1    BI partner: assigned                                              │
│ Overview · AI-Ready · Self-service AI · Metrics 214 · Glossary 86 (+23) · Data marts 41 · Dashboards 132   │
├──────────────────────────┬───────────────────────────────────────────────┬─────────────────────────────────┤
│ [Search term…        /]  │ Mode: (•) Focus  ( ) Concept map  Depth [1|2] │ Active buyer          ● approved│
│ Status: [Approved ▾]     │ Show: [x]Terms [x]Metrics [x]Dimensions       │ Synonyms: active shopper, MAB  │
│ Type: [all ▾]  [x]key    │       [ ]Columns [ ]Data marts [x]Documents   │ Owner: BI partner, Buyers      │
│ Sort: usage              │ ┌───────────────────────────────────────────┐ │ Approved by business ✓ Sep 12 │
│──────────────────────────│ │        ( Buyer )                          │ │────────────────────────────────│
│ ● Active buyer         ★ │ │              │ broader                    │ │ Definition                     │
│   3 metrics · 2 columns  │ │   ┌──────────┴────────┐   related         │ │ A user with at least one       │
│ ● Contact              ★ │ │   [ ACTIVE BUYER ]────────────( Contact ) │ │ contact in 28 days…            │
│   5 metrics · 1 column   │ │   │      │        │                       │ │ Example: …                     │
│ ● Listing view           │ │   ○ buyers_active_dau  ○ buyers_active_mau│ │────────────────────────────────│
│ ◌ Shopper  candidate 0.8 │ │   ●healthy          ●unhealthy            │ │ Sources (3)                    │
│ ◌ Lead     conflict   !  │ │          │ sliced_by                       │ │ "…we count as active…" ↗       │
│ ● Category               │ │          ◎ category      ▭ Clinics glossary  │ │   Clinics glossary, sec. 2       │
│ ○ Order    stale      ⟳  │ └───────────────────────────────────────────┘ │ + 2 more                       │
│ …                        │ Hover — neighbors; click — card;              │────────────────────────────────│
│ [ In review 23 → ]       │ double-click — focus on the node              │ Metrics          Columns       │
│ [ + Term ]               │ Legend: ▢ term ○ metric ◎ dimension ▭ doc     │ ● buyers_active_dau ↗          │
│                          │         ■ data mart ▪ column ─ appr. ┄ sugg.  │ ● …is_active        ↗          │
│                          │                                               │ ┄ 2 links await the curator    │
│                          │                                               │────────────────────────────────│
│                          │                                               │ Usage: 3 metrics, 4.1k uses;   │
│                          │                                               │ agents: 37 requests            │
│                          │                                               │ [Edit] [History] [Copy link]   │
└──────────────────────────┴───────────────────────────────────────────────┴─────────────────────────────────┘
```

### Graph

**Node types** (continue the visual language of `net.js`: metric — sphere, data mart — cube, metric source — torus):

| Node | 2D | 3D | Color |
|---|---|---|---|
| Term | capsule with the label inside | flat text sprite | outline by status: solid accent — approved, dashed gray — candidate, yellow — stale, red — conflict |
| Metric | circle | sphere (as in `net.js`) | health, F1 |
| Dimension | circle with a ring | small torus (different size and label from a metric source) | neutral gray |
| Data mart | square | cube (as in `net.js`) | health, F1 |
| Column | small square attached to its data mart | small cube | inherits the data mart color, lighter |
| Wiki page | "sheet" rectangle | flat rectangle | neutral, accent on hover |

**Link types.** Term — term: a thin gray line, the type label on hover (`broader` with an arrow to the general concept; `synonym` is not drawn — synonyms live inside the node). Term — object: an accent line. A suggested, unapproved link is dashed. Width 1–2.4 px, the same strip shader as in `net.js`.

**Modes.**
- **Focus (default, P0).** The selected term in the center, neighbors one step away, two steps on request. Objects are laid out in layers from left to right, as in the links window: documents → terms → metrics and dimensions → data marts and columns. At most 40 nodes; the rest is a counter like "18 more columns", expanded by click.
- **Concept map (P1).** Only terms and their links; the `broader` hierarchy as a tree, `related` as arcs. Answers "which concepts exist in the domain and how they fit together", without objects.
- **Coverage (P1).** The subdomain's metrics and data marts with usage above zero; those without a term are faded. Answers "which used objects are not explained".
- 3D is a toggle, as in the links window (P2); the main view is 2D.

**Filters.** Node types, term status, key terms only, healthy objects only, show candidates (off by default outside review mode), depth.

**Interaction.** Hover highlights neighbors; click opens the card on the right; double-click focuses the node with focus breadcrumbs ("Buyer › Active buyer"); a click on a metric or column opens the D9 object card with a link to the Semantic Layer or the Data Catalog.

### Term card

Block order:
1. Name, status badge, key flag (star), synonyms and abbreviations.
2. Owner, who approved it and when, "approved by the business" for key terms.
3. Definition, example, scope note ("Telehealth counts this differently — see …").
4. Sources: quote, page, section, page edit date, link; if the source changed after approval, a warning and a diff.
5. Related concepts: broader, narrower, related, depends on.
6. Metrics and dimensions with health and usage; columns and data marts with health; suggested links in a separate group with buttons for those who have rights.
7. Usage: total usage of linked metrics and data marts, number of agent requests for the term over 30 days (P1, once logs exist), dashboards where linked metrics appear.
8. History: revisions, who changed what, where the definition came from (LLM / manual / import).

### Wireframe 2. Candidate card in review mode

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ In review: 23   [All] [Strong 9] [Conflicts 2] [Stale 3] [Metric links 7]     │
├──────────────────────────────┬────────────────────────────────────────────────┤
│ ◌ Shopper          0.82  ◄── │ Shopper                  ◌ candidate from Wiki │
│ ◌ Buyer protection 0.77      │ Similar to: ● Buyer (0.91) → [Merge with Buyer]│
│ ! Lead             conflict  │────────────────────────────────────────────────│
│ ◌ Paid promotion   0.64      │ Definition (suggested by LLM, explicit)        │
│ ◌ Response         0.58      │ [A user who views listings and writes to      ]│
│ ⟳ Order           source     │ [patients in Clinics specialties.                 ]│
│   changed                    │                                                │
│ …                            │ Quotes (2 pages)                               │
│                              │ "A shopper is a user who…" ↗                   │
│                              │   Buyers / Glossary, edited Aug 3, 2026        │
│                              │ "…shoppers who wrote at least once…" ↗         │
│                              │   Funnel study Q2, edited May 14, 2026         │
│                              │                                                │
│                              │ Suggested links                                │
│                              │ ┄ broader → User                  [✓] [✕]      │
│                              │ ┄ measured_by → buyers_total 0.7 [awaits curator]│
│                              │ ┄ stored_in → buyer_stream.user_id [✓] [✕]     │
│                              │                                                │
│                              │ Why a candidate: explicit definition,          │
│                              │ 2 sources, a subdomain metric mentioned nearby │
│                              │                                                │
│                              │ [A Accept] [E Accept with edit] [M Merge…]     │
│                              │ [R Reject ▾ not a term / duplicate / wrong / outdated]│
└──────────────────────────────┴────────────────────────────────────────────────┘
```

### Wireframe 3. Definition conflict and empty state

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Conflict: "Lead"                                                           │
├─────────────────────────────────────┬──────────────────────────────────────┤
│ Option 1                            │ Option 2                             │
│ "A lead is a buyer contacting a     │ "We count a call or chat as a lead   │
│  seller through chat or a call"     │  after 30 seconds…"                  │
│ Clinics glossary ↗  edited Aug 3, 2026│ Visit cost method ↗  edited 2025     │
│ nearby: metric contacts_total       │ nearby: metric leads_quality         │
├─────────────────────────────────────┴──────────────────────────────────────┤
│ ( ) Keep option 1   ( ) Keep option 2   ( ) Write a common one             │
│ (•) Split into two terms: "Lead" and "Qualified lead" (broader: Lead)      │
│ Comment: [                                                           ]     │
│                                            [Cancel]  [Save and review]     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ Glossary                                                                   │
│                                                                            │
│   The subdomain glossary has no terms yet.                                 │
│   Agents answer questions about "Buyers" without a domain vocabulary,      │
│   and 1.4 Domain knowledge does not count a glossary.                      │
│                                                                            │
│   1. Choose the Wiki pages that describe the subdomain's concepts          │
│      Suggested: 14 pages that mention your metrics  [View]                 │
│   2. Run extraction — candidates appear in the review queue                │
│   3. Approve key terms: start with the 10 most used metrics                │
│                                                                            │
│   [Choose sources]   [Create a term by hand]                               │
│   No BI partner — nobody can approve the glossary. Assign in the registry →│
└────────────────────────────────────────────────────────────────────────────┘
```

### Term states in the interface

| State | Badge | Where visible | Visible to agents by default |
|---|---|---|---|
| Candidate from the Wiki | dashed circle, confidence | review mode, "candidates" filter | no |
| Created by hand, in review | circle with a pencil | list with a filter, review | no |
| Approved | filled accent circle | everywhere | yes |
| Approved, key, approved by the business | filled circle, star, check | everywhere | yes, with priority |
| Stale | yellow refresh arrow | everywhere, with a warning | yes, flagged `stale` |
| Conflict | red exclamation mark | review, list | no, until resolved |
| Deprecated | gray, struck through | only through a filter | the `replaced_by` term |

---

## Quality indicators and 1.4 Domain knowledge

### Subdomain glossary metrics

| Indicator | How it is computed | Target for L2 (proposal) |
|---|---|---|
| Metric coverage | share of uses of the subdomain's metrics (30 days) that fall on metrics with an approved `measured_by` link | ≥ 60% |
| Key metric coverage | share of the subdomain's key metrics with an approved term | 100% |
| Data mart coverage | share of uses of the subdomain's data marts that fall on data marts with at least one column linked to a term | ≥ 40% |
| Approved share | approved / (approved + candidates with confidence ≥ 0.4 + in review) | ≥ 70% |
| Freshness | share of approved terms not in `stale` | ≥ 90% |
| Open conflicts | number of `conflict` tasks older than 14 days | 0 |
| With a source | share of approved terms with a quote or a source link | ≥ 90% |
| Agent hit rate (P1) | share of `resolve` calls that find an approved term | observed, no target |

Weighting by usage follows the same approach as 1.1–1.3: unused metrics and data marts without a term do not pull the indicator down.

### How the glossary enters 1.4 Domain knowledge

The logic of 1.4 is to be defined and the component is excluded from the readiness axis. Today the demo shows the share of used objects with a description and the size of the Knowledge Base (FAQ, glossary, text-to-SQL examples) separately. Options:

| Option | Formula | Pros | Cons |
|---|---|---|---|
| 1. Glossary as a second factor | 1.4 = 0.6 · described objects + 0.4 · coverage of metrics and data marts by approved terms | simple; rewards linking terms to objects that are actually used | changes all subdomain scores at once; subdomains without a glossary drop |
| 2. Glossary as a condition | 1.4 counts only descriptions of used objects that have an approved term or a description approved by the owner | no new scale; strengthens "approved by the owner" | the glossary looks like a filter, not a contribution |
| 3. A separate readiness component "Domain vocabulary" | a new component of the readiness axis | transparent, visible separately in the AI-Ready score | changes the methodology; needs agreement with its owners |

In every option LLM candidates do not count and `stale` terms count with a 0.5 factor.

---

## API for consumers

Read only; approved terms by default. The format is compatible with SKOS JSON-LD for export; API responses are compact JSON.

| Method | Purpose | Consumer |
|---|---|---|
| `GET /glossary/{scheme}/terms?q=&status=&kind=` | list and search by name, synonyms and hidden labels | portal, search A2 |
| `GET /glossary/terms/{id}` | card: definition, synonyms, links, sources, status, `replaced_by` | agents, Knowledge Base skills |
| `POST /glossary/resolve` `{text, scheme?, include_candidates?}` | find terms in a user question and return linked metrics, dimensions and columns with their health | text-to-SQL, AI Assistant |
| `GET /glossary/graph?focus={id}&depth=1..2&types=` | a subgraph for visualization and for agent context | portal, agents |
| `GET /glossary/{scheme}/export?format=skos|yaml` | export of the subdomain glossary | Knowledge Base, Control Plane |
| `GET /glossary/{scheme}/quality` | quality indicators on a date | portal (1.4), digest |

Agent tools on top of the API: `glossary_resolve(text)`, `glossary_lookup(term)`, `glossary_graph(term, depth)`. The agent receives the human definition and a separate `agent_hint` field (as `meta.ai_context` in Cube): how to apply the term in a query, common mistakes, which metric to take by default.

For Knowledge Base skills: export `glossary.yaml` to the domain's Knowledge Base repository so a skill reads the file without network calls. With storage option A no export is needed — the file is the source.

---

## Delivery plan

| Priority | What | Done when |
|---|---|---|
| **P0** | The "Glossary" tab (`#/s/<i>/gl`) on sample data for a few pilot subdomains, labeled "sample" until a source is connected | the tab opens by link, the counter shows in the tabs |
| P0 | Term list with search by name and synonyms, status and key filters | any term is found by a synonym |
| P0 | Term card: definition, synonyms, status, owner, sources with quotes and Wiki links, linked metrics and data marts with health | every term shows where it came from |
| P0 | Focus graph in 2D, depth 1–2, nodes: term, metric, dimension, data mart, document | a term's graph reads without searching inside it |
| P0 | An offline extraction script from the Wiki for the pilot: chunking, schema extraction, quote check, merging by name and embeddings, linking to metrics | in the pilot the BI partner accepts ≥ 70% of strong candidates (measured on 50) |
| P0 | Review mode as a stub, like C10: "Accept / Merge / Reject" build a request on screen and save nothing | the pilot BI partner went through the queue and gave feedback |
| P1 | Storage by the chosen option, real review with roles, edit history | an edit survives a reload and has an author and a reviewer |
| P1 | Links to Data Catalog columns, "Concept map" and "Coverage" modes, conflicts and staleness | key terms have columns |
| P1 | Quality indicators and the 1.4 contribution by the chosen option, lines in the weekly digest | 1.4 changes after a term is approved |
| P1 | `resolve` and `lookup` API, agent tools, export to the Knowledge Base | an agent answers with a term and cites it |
| P2 | 3D graph mode, `close_match` across subdomains, a company-wide glossary, terms on the factory map | — |
| P2 | Restricted Wiki pages with inherited permissions | — |
| P3 | Agent request logs in the card; frequent questions without a term as a source of candidates | — |

Pilot: subdomains with an assigned BI partner, a Knowledge Base skill and existing glossary entries — they offer material to compare what the LLM found with what was written by hand.

---

## Risks and overlaps

- **Existing glossary entries in the Knowledge Base.** A new glossary without importing them becomes a second vocabulary. Needed: import as `origin = import` with status `approved` or `in_review`, and one place to edit.
- **Synonyms and concepts in the Control Plane.** If the Control Plane holds a semantic model of the domain (metrics, dimensions, filters, joins, synonyms as one artifact), glossary synonyms and concepts are the same entity. Agree before P1: either the glossary feeds the Control Plane (candidates and review), or the Control Plane is the store and the portal is the view and the review queue (option C).
- **Metric description in the Semantic Layer.** The metric definition lives in the Semantic Layer. The glossary keeps only the `measured_by` link and the business meaning; mismatches go to the metrics curator.
- **Column descriptions in the Data Catalog.** A column description and a term linked to the column can diverge. The `stored_in` link can be shown in the Data Catalog next to the description, or the catalog gets its own "business term" entity (option C).
- **Incomplete metric-to-data-mart lineage.** If metric sources are not fully mapped to data marts, the "term → metric → data mart" chain stays incomplete; `stored_in` closes part of the gap but does not replace lineage.
- **No agent logs.** Term usage by agents cannot be counted without AI Assistant logs — the same blocker as for the result axis.
- **LLM quality: invented definitions.** Measures: a mandatory verified quote, no auto-approval, a reference sample to evaluate the prompt.
- **Noise: hundreds of common-word candidates.** Measures: pre-filter, confidence threshold, the "not a term" rejection reason as prompt feedback.
- **Leaks: quotes from restricted pages.** Measure: only open pages in the first version.
- **BI partner load: the queue grows faster than it is reviewed.** Measures: key metrics first, a limit of 50 strong candidates a week, the digest instead of notifications.
- **Principle 1.** Glossary editing in the portal is a second exception after the Domain Registry; the storage decision should be recorded in the cross-cutting principles.

---

## Open questions

1. Where does the glossary live: Git (A), a portal service (B), the Control Plane or the Data Catalog (C)? Who owns the service in B and C?
2. The boundary with the Control Plane: is the glossary part of the domain's semantic model or a separate layer the model refers to?
3. How does the glossary count toward 1.4 (options 1–3), and who approves the methodology change?
4. Is a company-wide glossary needed for terms like "listing" and "user", and who owns it?
5. Which LLM and quota are available for batch extraction, and may Wiki content be sent to it?
6. Who approves a term-to-column link if the data mart owner is not the subdomain's BI partner?
7. Do key terms need approval by the data owner, or is the BI partner enough?
