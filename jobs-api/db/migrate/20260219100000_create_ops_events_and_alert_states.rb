class CreateOpsEventsAndAlertStates < ActiveRecord::Migration[8.1]
  def change
    create_table :ops_events do |t|
      t.string :code, null: false
      t.string :severity, null: false, default: "warning"
      t.text :context_payload, null: false, default: "{}"
      t.datetime :occurred_at, null: false

      t.timestamps
    end

    add_index :ops_events, [:code, :occurred_at]
    add_index :ops_events, :occurred_at

    create_table :ops_alert_states do |t|
      t.string :code, null: false
      t.string :fingerprint, null: false, default: "global"
      t.boolean :active, null: false, default: false
      t.string :active_level, null: false, default: "normal"
      t.integer :last_value
      t.datetime :last_observed_at
      t.datetime :last_emitted_at
      t.datetime :last_recovered_at
      t.datetime :recovery_started_at

      t.timestamps
    end

    add_index :ops_alert_states, [:code, :fingerprint], unique: true
  end
end
