module Ops
  class Monitor
    AUTH_LINK_ERROR_EVENT = "api_auth_link_error".freeze
    INTAKE_VALIDATION_ERROR_EVENT = "api_intake_validation_error".freeze
    INTAKE_DUPLICATE_EVENT = "api_intake_duplicate".freeze

    def initialize(now: Time.current, logger: Rails.logger)
      @now = now
      @dispatcher = AlertDispatcher.new(service: "jobs-api", logger: logger, now: now)
    end

    def record_auth_link_error!(context: {})
      OpsEvent.record!(code: AUTH_LINK_ERROR_EVENT, severity: "warning", context: context, occurred_at: now)
      evaluate_auth_link_errors!
    end

    def record_intake_validation_error!(context: {})
      OpsEvent.record!(code: INTAKE_VALIDATION_ERROR_EVENT, severity: "warning", context: context, occurred_at: now)
      evaluate_intake_validation_errors!
    end

    def record_intake_duplicate!(context: {})
      OpsEvent.record!(code: INTAKE_DUPLICATE_EVENT, severity: "warning", context: context, occurred_at: now)
    end

    def evaluate_all!
      evaluate_unresolved_ingest_failures!
      evaluate_auth_link_errors!
      evaluate_intake_validation_errors!
    end

    def evaluate_unresolved_ingest_failures!
      value = IngestFailure.unresolved.count
      evaluate_signal(
        code: "API_INGEST_FAILURE_UNRESOLVED_HIGH",
        value: value,
        warn_threshold: fetch_positive_integer("RLS_INGEST_FAILURE_WARN", 10),
        critical_threshold: fetch_positive_integer("RLS_INGEST_FAILURE_CRITICAL", 50),
        message: "Unresolved ingest failures are above threshold.",
        window_label: "current",
      )
    end

    def evaluate_auth_link_errors!
      value = OpsEvent.for_code(AUTH_LINK_ERROR_EVENT).since(15.minutes.ago).count
      evaluate_signal(
        code: "API_AUTH_LINK_ERRORS_HIGH",
        value: value,
        warn_threshold: fetch_positive_integer("RLS_AUTH_LINK_ERROR_WARN", 5),
        critical_threshold: nil,
        message: "Auth-link issuance errors are above threshold.",
        window_label: "15m",
      )
    end

    def evaluate_intake_validation_errors!
      value = OpsEvent.for_code(INTAKE_VALIDATION_ERROR_EVENT).since(15.minutes.ago).count
      evaluate_signal(
        code: "API_INTAKE_VALIDATION_ERRORS_HIGH",
        value: value,
        warn_threshold: fetch_positive_integer("RLS_INTAKE_VALIDATION_ERROR_WARN", 20),
        critical_threshold: nil,
        message: "Intake validation errors are above threshold.",
        window_label: "15m",
      )
    end

    private

    attr_reader :now, :dispatcher

    def evaluate_signal(code:, value:, warn_threshold:, critical_threshold:, message:, window_label:)
      level = if critical_threshold.present? && value >= critical_threshold
        "critical"
      elsif value >= warn_threshold
        "warning"
      else
        "normal"
      end

      state = OpsAlertState.fetch(code: code, fingerprint: "global")
      previous_level = state.active_level
      was_active = state.active

      state.last_observed_at = now
      state.last_value = value

      if level == "normal"
        if was_active
          state.recovery_started_at ||= now
          if now - state.recovery_started_at >= dispatcher.min_interval_seconds.seconds
            dispatcher.emit(
              severity: "warning",
              code: "#{code}_RECOVERED",
              message: "#{code} recovered below threshold.",
              context: {
                value: value,
                window: window_label,
                warn_threshold: warn_threshold,
                critical_threshold: critical_threshold,
              },
              fingerprint: "global",
            )

            state.active = false
            state.active_level = "normal"
            state.last_recovered_at = now
            state.recovery_started_at = nil
          end
        end

        state.save!
        return
      end

      state.recovery_started_at = nil
      state.active = true
      state.active_level = level
      state.save!

      return if was_active && previous_level == level

      dispatcher.emit(
        severity: level,
        code: code,
        message: message,
        context: {
          value: value,
          window: window_label,
          warn_threshold: warn_threshold,
          critical_threshold: critical_threshold,
        },
        fingerprint: "global",
      )
    end

    def fetch_positive_integer(key, fallback)
      value = ENV.fetch(key, fallback.to_s).to_i
      value.positive? ? value : fallback
    end
  end
end
