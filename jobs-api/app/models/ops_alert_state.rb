class OpsAlertState < ApplicationRecord
  LEVELS = %w[normal warning critical].freeze

  validates :code, presence: true
  validates :fingerprint, presence: true
  validates :active_level, presence: true, inclusion: { in: LEVELS }

  scope :for_code, ->(code) { where(code: code) }

  def self.fetch(code:, fingerprint: "global")
    find_or_initialize_by(code: code, fingerprint: fingerprint.presence || "global")
  end
end
