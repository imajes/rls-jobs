require 'digest'
require 'securerandom'

class AuthLink < ApplicationRecord
  TOKEN_LENGTH = 32

  validates :token_digest, presence: true, uniqueness: true
  validates :slack_user_id, presence: true
  validates :slack_team_id, presence: true
  validates :expires_at, presence: true

  scope :active, -> { where(consumed_at: nil).where('expires_at > ?', Time.current) }

  def self.issue!(slack_user_id:, slack_team_id:, slack_user_name:, ttl: 10.minutes)
    raw = SecureRandom.urlsafe_base64(TOKEN_LENGTH)
    record = create!(
      token_digest: digest(raw),
      slack_user_id: slack_user_id,
      slack_team_id: slack_team_id,
      slack_user_name: slack_user_name,
      expires_at: Time.current + ttl
    )

    [record, raw]
  end

  def self.find_by_token(token)
    return nil if token.blank?

    find_by(token_digest: digest(token))
  end

  def self.digest(token)
    Digest::SHA256.hexdigest(token.to_s)
  end

  def redeem!(request_ip: nil)
    return false if consumed_at.present? || expired?

    update(consumed_at: Time.current, consumed_ip: request_ip)
  end

  def expired?
    expires_at <= Time.current
  end
end
