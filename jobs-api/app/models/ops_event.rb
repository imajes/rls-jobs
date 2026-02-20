class OpsEvent < ApplicationRecord
  SEVERITIES = %w[warning critical].freeze

  validates :code, presence: true
  validates :severity, presence: true, inclusion: { in: SEVERITIES }
  validates :context_payload, presence: true
  validates :occurred_at, presence: true

  scope :for_code, ->(code) { where(code: code) }
  scope :since, ->(timestamp) { where("occurred_at >= ?", timestamp) }

  def context_hash
    JSON.parse(context_payload || "{}")
  rescue JSON::ParserError
    {}
  end

  def self.record!(code:, severity: "warning", context: {}, occurred_at: Time.current)
    create!(
      code: code,
      severity: severity,
      context_payload: JSON.generate(context || {}),
      occurred_at: occurred_at,
    )
  end
end
