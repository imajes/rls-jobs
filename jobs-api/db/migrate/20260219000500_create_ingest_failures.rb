class CreateIngestFailures < ActiveRecord::Migration[8.1]
  def change
    create_table :ingest_failures do |t|
      t.string :event_fingerprint, null: false
      t.string :event_type
      t.string :kind
      t.text :reason, null: false
      t.text :payload, null: false
      t.datetime :first_seen_at, null: false
      t.datetime :last_seen_at, null: false
      t.integer :failure_count, null: false, default: 1
      t.datetime :resolved_at
      t.datetime :replayed_at

      t.timestamps
    end

    add_index :ingest_failures, :event_fingerprint, unique: true
    add_index :ingest_failures, :event_type
    add_index :ingest_failures, :kind
    add_index :ingest_failures, :resolved_at
    add_index :ingest_failures, :last_seen_at
  end
end
