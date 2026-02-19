class Posting < ApplicationRecord
  KINDS = %w[job_posting candidate_profile].freeze
  STATUSES = %w[active archived].freeze
  MODERATION_STATES = %w[unreviewed reviewed cleared escalated].freeze

  has_many :intake_events, dependent: :nullify
  before_validation :apply_default_moderation_state

  validates :external_posting_id, presence: true, uniqueness: true
  validates :kind, presence: true
  validates :status, presence: true
  validates :values_payload, presence: true
  validates :last_payload, presence: true
  validates :kind, inclusion: { in: KINDS }
  validates :status, inclusion: { in: STATUSES }
  validates :moderation_state, inclusion: { in: MODERATION_STATES }

  scope :jobs, -> { where(kind: 'job_posting') }
  scope :candidates, -> { where(kind: 'candidate_profile') }
  scope :active, -> { where(status: 'active') }
  scope :archived, -> { where(status: 'archived') }
  scope :moderation_flagged, -> { where(moderation_flagged: true) }
  scope :moderation_state_is, ->(state) { where(moderation_state: state) }

  def self.search_text_from_values(values)
    normalized = values.to_h.deep_stringify_keys
    fragments = [
      normalized['companyName'],
      normalized['roleTitle'],
      normalized['headline'],
      normalized['locationSummary'],
      normalized['summary'],
      normalized['notes'],
      normalized['skills'],
      Array(normalized['workArrangements']).join(' '),
      Array(normalized['employmentTypes']).join(' '),
      Array(normalized['engagementTypes']).join(' '),
      Array(normalized['availabilityModes']).join(' '),
      normalized['compensationValue'],
      normalized['relationship']
    ]

    fragments.compact.map(&:to_s).reject(&:blank?).join(' ').downcase
  end

  def values_hash
    JSON.parse(values_payload || '{}')
  rescue JSON::ParserError
    {}
  end

  def last_payload_hash
    JSON.parse(last_payload || '{}')
  rescue JSON::ParserError
    {}
  end

  def title
    if kind == 'job_posting'
      role = role_title.presence || values_hash['roleTitle'].presence || 'Role'
      company = company_name.presence || values_hash['companyName'].presence || 'Company'
      "#{role} at #{company}"
    else
      headline.presence || values_hash['headline'].presence || 'Candidate profile'
    end
  end

  def resync_from_values!
    values = values_hash
    assign_attributes(
      company_name: values['companyName'],
      role_title: values['roleTitle'],
      headline: values['headline'],
      location_summary: values['locationSummary'],
      compensation_value: values['compensationValue'],
      visa_policy: values['visaPolicy'],
      relationship: values['relationship'],
      skills: values['skills'],
      summary: values['summary'] || values['notes'],
      search_text: self.class.search_text_from_values(values)
    )
    save!
  end

  private

  def apply_default_moderation_state
    self.moderation_state = 'unreviewed' if moderation_state.blank?
  end
end
