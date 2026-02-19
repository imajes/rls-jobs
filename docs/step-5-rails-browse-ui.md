# Step Five - Rails Browse UI for Jobs and Candidates

Date: 2026-02-19

## Outcome

Built a Rails-first responsive browse experience over persisted posting data with search, filtering, sorting, and detail views.

## What was implemented

- Added `PostingsController` with:
  - `index` for searchable/filterable listing feed
  - `show` for full details and provenance
- Added routes:
  - `root` -> `postings#index`
  - `resources :postings, only: [:index, :show]`
- Added responsive UI views:
  - `app/views/postings/index.html.erb`
  - `app/views/postings/show.html.erb`
- Added visual system in `app/assets/stylesheets/application.css` with:
  - responsive card/grid layout
  - clear filtering panel
  - status/kind badges
  - readable detail cards and JSON payload inspection panes

## Filters and sorting

`index` supports:

- free-text search (`q`)
- kind (`job_posting` / `candidate_profile`)
- status (`active` / `archived`)
- channel focus
- visa policy
- compensation presence
- work arrangement token filter
- employment type token filter
- sorting (`recently_updated`, `newest`, `oldest`, `company_az`, `compensation`)
- configurable limit (10..200)

## Test coverage added

- `test/controllers/postings_controller_test.rb`
  - index renders
  - filter behavior for kind + search
  - show page renders details

## Verification status

- Rails execution in this shell remains blocked by local Ruby/Bundler mismatch against Rails 8 lockfile.
- Controller/view/tests are committed and ready to run in the correct runtime.

## Next step linkage

Step Six will add RLS-gated authentication so only users validated via Slack one-time links can access this browse UI.
