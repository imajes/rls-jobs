class Posting < ApplicationRecord
  has_many :intake_events, dependent: :nullify

  validates :external_posting_id, presence: true, uniqueness: true
  validates :kind, presence: true
  validates :status, presence: true
  validates :values_payload, presence: true
  validates :last_payload, presence: true

  scope :jobs, -> { where(kind: 'job_posting') }
  scope :candidates, -> { where(kind: 'candidate_profile') }
  scope :active, -> { where(status: 'active') }
  scope :archived, -> { where(status: 'archived') }

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
end
