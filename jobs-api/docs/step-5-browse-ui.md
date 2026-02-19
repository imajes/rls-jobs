# Step Five - Browse UI

Date: 2026-02-19

## New routes

- `/` (root) -> `postings#index`
- `/postings`
- `/postings/:id`

## Controller

`PostingsController` introduces a query-driven read layer over `postings`:

- defensive param normalization
- composable filtering for structured columns and text index
- bounded result limits
- deterministic sort options

## Views

- `index`:
  - dashboard-style metrics
  - multi-filter search form
  - responsive listing cards
  - Slack permalink shortcut
- `show`:
  - structured field summary
  - Slack provenance metadata
  - pretty-printed source values and latest webhook payload

## Styling

Replaced default placeholder CSS with a deliberate responsive theme:

- typography and spacing tuned for dense scan behavior
- badge/chip vocabulary for kind/status/tags
- mobile breakpoints for form, cards, and details

## Tests

Added request/controller tests for core browse behavior:

- `test/controllers/postings_controller_test.rb`
