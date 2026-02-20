module Api
  module V1
    class IntakeController < BaseController
      before_action :require_ingest_token!

      def create
        return if performed?

        payload = parse_payload
        return if performed?

        result = IngestSlackEvent.new(payload:).call
        monitor = Ops::Monitor.new

        if result.errors.any?
          monitor.record_intake_validation_error!(
            context: {
              reason: result.errors.join("; "),
              event_type: payload["eventType"],
              kind: payload["kind"],
            }
          )
          monitor.evaluate_unresolved_ingest_failures!
          render json: { ok: false, errors: result.errors }, status: :unprocessable_entity
          return
        end

        monitor.evaluate_unresolved_ingest_failures!

        render json: {
          ok: true,
          duplicate: result.duplicate,
          posting: {
            id: result.posting.id,
            external_posting_id: result.posting.external_posting_id,
            kind: result.posting.kind,
            status: result.posting.status
          },
          intake_event: {
            id: result.intake_event.id,
            event_type: result.intake_event.event_type,
            occurred_at: result.intake_event.occurred_at
          }
        }, status: result.duplicate ? :ok : :created
      end

      private

      def parse_payload
        raw = request.raw_post.to_s
        if raw.blank?
          Ops::Monitor.new.record_intake_validation_error!(context: { reason: "empty_request_body" })
          render json: { ok: false, error: 'request body cannot be empty' }, status: :bad_request
          return {}
        end

        JSON.parse(raw)
      rescue JSON::ParserError
        Ops::Monitor.new.record_intake_validation_error!(context: { reason: "invalid_json" })
        render json: { ok: false, error: 'invalid_json' }, status: :bad_request
        {}
      end
    end
  end
end
