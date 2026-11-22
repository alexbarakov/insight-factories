# Insight Factories — app

The static site of the open demo. What the project is, how to run it and how the AI-Ready score works: see the [root README](../README.md). The full specification is in [docs/functional-blocks.md](../docs/functional-blocks.md).

## Module map

| File | Role |
|---|---|
| `index.html`, `portal.js` | Portal: overview, domain and subdomain cabinets, problems, my factories, digest, onboarding, search, object panel |
| `skin.js` | Terms, roles, task texts and links to the 3D pages; the only file that differs between skins of the shared engine |
| `model.js` | Shared model: health aggregates, problems, good output, tasks, staff, AI-Ready components, levels and awards |
| `products.js` | Health checks per object type and links to the tools where they are fixed |
| `portal.css`, `theme.css` | Portal styles; design tokens for light and dark themes (see `docs/design-tokens.md`) |
| `domain.html`, `app.js` | 3D factory of a subdomain, with the guided tour |
| `office.js` | The office building with the subdomain staff, used in the factory and the world |
| `world.html`, `world.js` | 3D Insight Factories world: zones, roads, trucks, ranking and monthly awards |
| `graph.html`, `graph.js`, `net.js`, `links-model.js` | Links window: cost × value, lineage graph (2D and 3D), flow; shared link data and findings |
| `net.html` | Redirect to `graph.html?v=net` for old links |
| `glmap3d.js` | 3D map of all glossary terms of a domain |
| `econ.js` | Data exchange economy stubs: supplier rating, supply contracts, transfer price |
| `agent.js` | Sample "fixing agent" scenario on problems; publishes nothing |
| `reffoot.js`, `refs.js` | Reference footer per page and the "Market references" button; both read `docs/` |
| `doc.html`, `md.js` | Renders the docs (`?f=spec`, `refs`, `glossary`) with a small Markdown renderer |
| `data/` | Synthetic data written by `pipeline/generate.mjs` |
| `vendor/` | three.js and its controls (MIT) |
