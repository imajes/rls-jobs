module Api
  module V1
    class AuthLinksController < BaseController
      before_action :require_ingest_token!

      def create
        return if performed?

        slack_user_id = params[:slack_user_id].to_s
        slack_team_id = params[:slack_team_id].to_s
        slack_user_name = params[:slack_user_name].to_s

        if slack_user_id.blank? || slack_team_id.blank?
          render json: { ok: false, error: 'slack_user_id and slack_team_id are required' }, status: :unprocessable_entity
          return
        end

        ttl_seconds = ENV.fetch('RLS_AUTH_LINK_TTL_SECONDS', '600').to_i
        ttl_seconds = 600 if ttl_seconds <= 0

        link, raw_token = AuthLink.issue!(
          slack_user_id: slack_user_id,
          slack_team_id: slack_team_id,
          slack_user_name: slack_user_name,
          ttl: ttl_seconds.seconds
        )

        render json: {
          ok: true,
          auth_url: "#{public_base_url}/auth/slack/#{raw_token}",
          expires_at: link.expires_at.iso8601,
          ttl_seconds: ttl_seconds
        }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { ok: false, error: e.message }, status: :unprocessable_entity
      end

      private

      def public_base_url
        configured = ENV['RLS_JOBS_WEB_BASE_URL'].to_s.strip
        return configured.chomp('/') if configured.present?

        request.base_url
      end
    end
  end
end
