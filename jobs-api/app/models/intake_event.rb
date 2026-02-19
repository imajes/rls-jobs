class IntakeEvent < ApplicationRecord
  belongs_to :posting, optional: true

  validates :event_fingerprint, presence: true, uniqueness: true
  validates :event_type, presence: true
  validates :kind, presence: true
  validates :source, presence: true
  validates :received_at, presence: true
  validates :payload, presence: true

  def payload_hash
    JSON.parse(payload || '{}')
  rescue JSON::ParserError
    {}
  end
end
