class CreateIntakeEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :intake_events do |t|
      t.references :posting, foreign_key: true

      t.string :event_fingerprint, null: false
      t.string :event_type, null: false
      t.string :kind, null: false
      t.string :source, null: false, default: 'slack_app'

      t.string :external_posting_id
      t.string :preview_id
      t.string :team_id
      t.string :channel_id
      t.string :published_message_ts
      t.string :user_id

      t.datetime :occurred_at
      t.datetime :received_at, null: false
      t.text :payload, null: false

      t.timestamps
    end

    add_index :intake_events, :event_fingerprint, unique: true
    add_index :intake_events, :event_type
    add_index :intake_events, :kind
    add_index :intake_events, :external_posting_id
    add_index :intake_events, :received_at
  end
end
