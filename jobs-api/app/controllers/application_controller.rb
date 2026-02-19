class ApplicationController < ActionController::Base
  RLS_SESSION_HARD_TTL = 1.hour
  RLS_SESSION_IDLE_WINDOW = 15.minutes

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  helper_method :rls_authenticated?, :rls_slack_user_id, :rls_hard_expires_at, :rls_idle_expires_at

  private

  def require_rls_session!
    unless rls_authenticated?
      redirect_to auth_required_path, alert: "Use /rls-jobs-auth in Slack to open a secure one-time access link."
      return false
    end

    true
  end

  def rls_authenticated?
    session[:rls_authenticated] == true
  end

  def rls_slack_user_id
    session[:rls_slack_user_id].to_s
  end

  def rls_hard_expires_at
    parse_session_time(:rls_hard_expires_at)
  end

  def rls_idle_expires_at
    parse_session_time(:rls_idle_expires_at)
  end

  def establish_rls_session!(slack_user_id:, slack_team_id:)
    started_at = Time.current
    hard_expires_at = started_at + RLS_SESSION_HARD_TTL
    idle_expires_at = [started_at + RLS_SESSION_IDLE_WINDOW, hard_expires_at].min

    session[:rls_authenticated] = true
    session[:rls_slack_user_id] = slack_user_id
    session[:rls_slack_team_id] = slack_team_id
    session[:rls_started_at] = started_at.iso8601
    session[:rls_last_seen_at] = started_at.iso8601
    session[:rls_hard_expires_at] = hard_expires_at.iso8601
    session[:rls_idle_expires_at] = idle_expires_at.iso8601
  end

  def refresh_rls_session!
    return true unless rls_authenticated?

    now = Time.current
    hard = rls_hard_expires_at
    idle = rls_idle_expires_at
    if hard.blank? || idle.blank? || now >= hard || now >= idle
      clear_rls_session!
      redirect_to auth_required_path, alert: "Your secure session has expired. Request a fresh link in Slack."
      return false
    end

    session[:rls_last_seen_at] = now.iso8601
    session[:rls_idle_expires_at] = [now + RLS_SESSION_IDLE_WINDOW, hard].min.iso8601
    true
  end

  def clear_rls_session!
    session.delete(:rls_authenticated)
    session.delete(:rls_slack_user_id)
    session.delete(:rls_slack_team_id)
    session.delete(:rls_started_at)
    session.delete(:rls_last_seen_at)
    session.delete(:rls_hard_expires_at)
    session.delete(:rls_idle_expires_at)
  end

  def parse_session_time(key)
    raw = session[key]
    return nil if raw.blank?

    Time.zone.parse(raw)
  rescue ArgumentError
    nil
  end
end
