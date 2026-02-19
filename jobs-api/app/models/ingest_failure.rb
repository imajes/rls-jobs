class IngestFailure < ApplicationRecord
  validates :event_fingerprint, presence: true, uniqueness: true
  validates :reason, presence: true
  validates :payload, presence: true
  validates :first_seen_at, presence: true
  validates :last_seen_at, presence: true

  scope :unresolved, -> { where(resolved_at: nil) }
  scope :recent_first, -> { order(last_seen_at: :desc) }

  def payload_hash
    JSON.parse(payload || '{}')
  rescue JSON::ParserError
    {}
  end

  def self.record!(event_fingerprint:, event_type:, kind:, payload:, reason:, occurred_at: Time.current)
    failure = find_or_initialize_by(event_fingerprint: event_fingerprint)
    failure.event_type = event_type
    failure.kind = kind
    failure.payload = JSON.generate(payload)
    failure.reason = reason
    failure.first_seen_at ||= occurred_at
    failure.last_seen_at = occurred_at
    failure.failure_count = failure.new_record? ? 1 : failure.failure_count.to_i + 1
    failure.resolved_at = nil
    failure.save!
    failure
  end

  def self.resolve_for_fingerprint!(fingerprint)
    return if fingerprint.blank?

    where(event_fingerprint: fingerprint, resolved_at: nil).update_all(resolved_at: Time.current, updated_at: Time.current)
  end
end
