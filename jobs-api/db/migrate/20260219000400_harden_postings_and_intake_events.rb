class HardenPostingsAndIntakeEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :intake_events, :payload_version, :integer, null: false, default: 1

    add_column :postings, :moderation_flagged, :boolean, null: false, default: false
    add_column :postings, :moderation_state, :string, null: false, default: 'unreviewed'
    add_column :postings, :moderation_reason, :string
    add_column :postings, :account_age_days, :integer
    add_column :postings, :moderation_last_reviewed_at, :datetime
    add_column :postings, :moderation_reviewed_by, :string

    add_index :postings, [:poster_user_id, :updated_at], name: 'index_postings_on_poster_user_and_updated_at'
    add_index :postings, [:team_id, :channel_id, :published_message_ts], name: 'index_postings_on_team_channel_message_ts'
    add_index :postings, :moderation_state
    add_index :postings, :moderation_flagged

    add_index :intake_events, [:event_type, :received_at], name: 'index_intake_events_on_event_type_and_received_at'

    add_check_constraint :postings,
      "status IN ('active', 'archived')",
      name: 'check_postings_status_allowlist'

    add_check_constraint :postings,
      "kind IN ('job_posting', 'candidate_profile')",
      name: 'check_postings_kind_allowlist'

    add_check_constraint :postings,
      "moderation_state IN ('unreviewed', 'reviewed', 'cleared', 'escalated')",
      name: 'check_postings_moderation_state_allowlist'

    add_check_constraint :intake_events,
      "event_type IN ('slack_post_published', 'slack_post_updated', 'slack_post_archived')",
      name: 'check_intake_events_event_type_allowlist'

    add_check_constraint :intake_events,
      "kind IN ('job_posting', 'candidate_profile')",
      name: 'check_intake_events_kind_allowlist'
  end
end
