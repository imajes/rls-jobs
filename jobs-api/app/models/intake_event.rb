class IntakeEvent < ApplicationRecord
  EVENT_TYPES = %w[slack_post_published slack_post_updated slack_post_archived].freeze
  KINDS = %w[job_posting candidate_profile].freeze

  belongs_to :posting, optional: true
  before_validation :apply_default_payload_version

  validates :event_fingerprint, presence: true, uniqueness: true
  validates :event_type, presence: true
  validates :kind, presence: true
  validates :source, presence: true
  validates :received_at, presence: true
  validates :payload, presence: true
  validates :payload_version, presence: true
  validates :event_type, inclusion: { in: EVENT_TYPES }
  validates :kind, inclusion: { in: KINDS }

  def payload_hash
    JSON.parse(payload || '{}')
  rescue JSON::ParserError
    {}
  end

  private

  def apply_default_payload_version
    self.payload_version = 1 if payload_version.blank?
  end
end
