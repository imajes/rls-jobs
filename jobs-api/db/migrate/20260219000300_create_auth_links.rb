class CreateAuthLinks < ActiveRecord::Migration[8.1]
  def change
    create_table :auth_links do |t|
      t.string :token_digest, null: false
      t.string :slack_user_id, null: false
      t.string :slack_team_id, null: false
      t.string :slack_user_name
      t.datetime :expires_at, null: false
      t.datetime :consumed_at
      t.string :consumed_ip
      t.timestamps
    end

    add_index :auth_links, :token_digest, unique: true
    add_index :auth_links, :slack_user_id
    add_index :auth_links, :slack_team_id
    add_index :auth_links, :expires_at
  end
end
