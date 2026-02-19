module Api
  module V1
    class BaseController < ActionController::API
      private

      def require_ingest_token!
        configured_token = ENV['RLS_JOBS_API_TOKEN'].to_s
        return if configured_token.blank?

        provided = bearer_token
        return if ActiveSupport::SecurityUtils.secure_compare(provided, configured_token)

        render json: { ok: false, error: 'unauthorized' }, status: :unauthorized
      end

      def bearer_token
        header = request.authorization.to_s
        return '' unless header.start_with?('Bearer ')

        header.delete_prefix('Bearer ').strip
      end
    end
  end
end
