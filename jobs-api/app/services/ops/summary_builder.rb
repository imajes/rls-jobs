module Ops
  class SummaryBuilder
    def initialize(now: Time.current)
      @now = now
    end

    def build
      intake_24h = IntakeEvent.where("received_at >= ?", now - 24.hours)
      intake_count = intake_24h.count
      duplicate_count = OpsEvent.for_code(Monitor::INTAKE_DUPLICATE_EVENT).since(now - 24.hours).count
      unresolved_failures = IngestFailure.unresolved.count

      {
        generated_at: now.utc.iso8601,
        operation_mode: operation_mode,
        unresolved_ingest_failures: unresolved_failures,
        replayed_failures_24h: IngestFailure.where("replayed_at >= ?", now - 24.hours).count,
        intake_volume_24h: intake_count,
        duplicate_ingest_count_24h: duplicate_count,
        duplicate_ingest_rate_24h: duplicate_rate(intake_count: intake_count, duplicate_count: duplicate_count),
        moderation_flagged_active: Posting.active.moderation_flagged.count,
        moderation_escalated: Posting.where(moderation_state: "escalated").count,
        auth_link_issuance_24h: AuthLink.where("created_at >= ?", now - 24.hours).count,
        auth_link_failures_24h: OpsEvent.for_code(Monitor::AUTH_LINK_ERROR_EVENT).since(now - 24.hours).count,
        intake_validation_failures_24h: OpsEvent.for_code(Monitor::INTAKE_VALIDATION_ERROR_EVENT).since(now - 24.hours).count,
        retention_cleanup_preview_90d: Posting.archived.where("COALESCE(archived_at, updated_at) < ?", now - 90.days).count,
      }
    end

    private

    attr_reader :now

    def operation_mode
      ENV.fetch("RLS_OPERATION_MODE", "normal").to_s == "beta" ? "beta" : "normal"
    end

    def duplicate_rate(intake_count:, duplicate_count:)
      denominator = intake_count + duplicate_count
      return 0.0 if denominator.zero?

      ((duplicate_count.to_f / denominator.to_f) * 100.0).round(2)
    end
  end
end
