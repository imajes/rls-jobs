class AuthController < ApplicationController
  skip_before_action :verify_authenticity_token, only: :redeem

  def required; end

  def redeem
    auth_link = AuthLink.find_by_token(params[:token])
    if auth_link.nil? || !auth_link.redeem!(request_ip: request.remote_ip)
      redirect_to auth_required_path, alert: 'This link is invalid, already used, or expired. Request a fresh link in Slack.'
      return
    end

    establish_rls_session!(slack_user_id: auth_link.slack_user_id, slack_team_id: auth_link.slack_team_id)
    redirect_to postings_path, notice: "Secure session started for #{auth_link.slack_user_id}."
  end

  def logout
    clear_rls_session!
    redirect_to auth_required_path, notice: 'Signed out from RLS listings.'
  end
end
