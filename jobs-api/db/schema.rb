# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_19_000500) do
  create_table "auth_links", force: :cascade do |t|
    t.datetime "consumed_at"
    t.string "consumed_ip"
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "slack_team_id", null: false
    t.string "slack_user_id", null: false
    t.string "slack_user_name"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_auth_links_on_expires_at"
    t.index ["slack_team_id"], name: "index_auth_links_on_slack_team_id"
    t.index ["slack_user_id"], name: "index_auth_links_on_slack_user_id"
    t.index ["token_digest"], name: "index_auth_links_on_token_digest", unique: true
  end

  create_table "ingest_failures", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_fingerprint", null: false
    t.string "event_type"
    t.integer "failure_count", default: 1, null: false
    t.datetime "first_seen_at", null: false
    t.string "kind"
    t.datetime "last_seen_at", null: false
    t.text "payload", null: false
    t.text "reason", null: false
    t.datetime "replayed_at"
    t.datetime "resolved_at"
    t.datetime "updated_at", null: false
    t.index ["event_fingerprint"], name: "index_ingest_failures_on_event_fingerprint", unique: true
    t.index ["event_type"], name: "index_ingest_failures_on_event_type"
    t.index ["kind"], name: "index_ingest_failures_on_kind"
    t.index ["last_seen_at"], name: "index_ingest_failures_on_last_seen_at"
    t.index ["resolved_at"], name: "index_ingest_failures_on_resolved_at"
  end

  create_table "intake_events", force: :cascade do |t|
    t.string "channel_id"
    t.datetime "created_at", null: false
    t.string "event_fingerprint", null: false
    t.string "event_type", null: false
    t.string "external_posting_id"
    t.string "kind", null: false
    t.datetime "occurred_at"
    t.text "payload", null: false
    t.integer "payload_version", default: 1, null: false
    t.integer "posting_id"
    t.string "preview_id"
    t.string "published_message_ts"
    t.datetime "received_at", null: false
    t.string "source", default: "slack_app", null: false
    t.string "team_id"
    t.datetime "updated_at", null: false
    t.string "user_id"
    t.index ["event_fingerprint"], name: "index_intake_events_on_event_fingerprint", unique: true
    t.index ["event_type", "received_at"], name: "index_intake_events_on_event_type_and_received_at"
    t.index ["event_type"], name: "index_intake_events_on_event_type"
    t.index ["external_posting_id"], name: "index_intake_events_on_external_posting_id"
    t.index ["kind"], name: "index_intake_events_on_kind"
    t.index ["posting_id"], name: "index_intake_events_on_posting_id"
    t.index ["received_at"], name: "index_intake_events_on_received_at"
    t.check_constraint "event_type IN ('slack_post_published', 'slack_post_updated', 'slack_post_archived')", name: "check_intake_events_event_type_allowlist"
    t.check_constraint "kind IN ('job_posting', 'candidate_profile')", name: "check_intake_events_kind_allowlist"
  end

  create_table "postings", force: :cascade do |t|
    t.integer "account_age_days"
    t.datetime "archived_at"
    t.string "archived_by_user_id"
    t.string "channel_focus"
    t.string "channel_id"
    t.string "channel_label"
    t.string "company_name"
    t.string "compensation_value"
    t.datetime "created_at", null: false
    t.string "external_posting_id", null: false
    t.string "headline"
    t.string "kind", null: false
    t.datetime "last_event_at"
    t.text "last_payload", null: false
    t.string "location_summary"
    t.boolean "moderation_flagged", default: false, null: false
    t.datetime "moderation_last_reviewed_at"
    t.string "moderation_reason"
    t.string "moderation_reviewed_by"
    t.string "moderation_state", default: "unreviewed", null: false
    t.text "permalink"
    t.datetime "posted_at"
    t.string "poster_user_id"
    t.string "preview_dm_channel_id"
    t.string "preview_dm_message_ts"
    t.string "preview_id"
    t.string "published_by_user_id"
    t.string "published_message_ts"
    t.string "relationship"
    t.string "role_title"
    t.text "search_text"
    t.text "skills"
    t.string "status", default: "active", null: false
    t.text "summary"
    t.string "team_id"
    t.datetime "updated_at", null: false
    t.text "values_payload", null: false
    t.string "visa_policy"
    t.index ["channel_focus"], name: "index_postings_on_channel_focus"
    t.index ["company_name"], name: "index_postings_on_company_name"
    t.index ["external_posting_id"], name: "index_postings_on_external_posting_id", unique: true
    t.index ["headline"], name: "index_postings_on_headline"
    t.index ["kind"], name: "index_postings_on_kind"
    t.index ["last_event_at"], name: "index_postings_on_last_event_at"
    t.index ["location_summary"], name: "index_postings_on_location_summary"
    t.index ["moderation_flagged"], name: "index_postings_on_moderation_flagged"
    t.index ["moderation_state"], name: "index_postings_on_moderation_state"
    t.index ["poster_user_id", "updated_at"], name: "index_postings_on_poster_user_and_updated_at"
    t.index ["role_title"], name: "index_postings_on_role_title"
    t.index ["status"], name: "index_postings_on_status"
    t.index ["team_id", "channel_id", "published_message_ts"], name: "index_postings_on_team_channel_message_ts"
    t.index ["team_id"], name: "index_postings_on_team_id"
    t.check_constraint "kind IN ('job_posting', 'candidate_profile')", name: "check_postings_kind_allowlist"
    t.check_constraint "moderation_state IN ('unreviewed', 'reviewed', 'cleared', 'escalated')", name: "check_postings_moderation_state_allowlist"
    t.check_constraint "status IN ('active', 'archived')", name: "check_postings_status_allowlist"
  end

  add_foreign_key "intake_events", "postings"
end
