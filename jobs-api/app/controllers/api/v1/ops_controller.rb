module Api
  module V1
    class OpsController < BaseController
      before_action :require_ingest_token!

      def summary
        Ops::Monitor.new.evaluate_all!
        render json: {
          ok: true,
          summary: Ops::SummaryBuilder.new.build,
        }
      end
    end
  end
end
