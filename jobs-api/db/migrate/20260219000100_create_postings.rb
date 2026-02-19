class CreatePostings < ActiveRecord::Migration[8.1]
  def change
    create_table :postings do |t|
      t.string :external_posting_id, null: false
      t.string :kind, null: false
      t.string :status, null: false, default: 'active'

      t.string :preview_id
      t.string :team_id
      t.string :poster_user_id
      t.string :published_by_user_id

      t.string :channel_id
      t.string :channel_focus
      t.string :channel_label
      t.string :preview_dm_channel_id
      t.string :preview_dm_message_ts
      t.string :published_message_ts
      t.text :permalink

      t.datetime :posted_at
      t.datetime :last_event_at
      t.datetime :archived_at
      t.string :archived_by_user_id

      t.string :company_name
      t.string :role_title
      t.string :headline
      t.string :location_summary
      t.string :compensation_value
      t.string :visa_policy
      t.string :relationship
      t.text :skills
      t.text :summary
      t.text :search_text

      t.text :values_payload, null: false
      t.text :last_payload, null: false

      t.timestamps
    end

    add_index :postings, :external_posting_id, unique: true
    add_index :postings, :kind
    add_index :postings, :status
    add_index :postings, :team_id
    add_index :postings, :channel_focus
    add_index :postings, :last_event_at
    add_index :postings, :company_name
    add_index :postings, :role_title
    add_index :postings, :headline
    add_index :postings, :location_summary
  end
end
