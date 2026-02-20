require "test_helper"

module Ops
  class MonitorTest < ActiveSupport::TestCase
    include ActiveSupport::Testing::TimeHelpers

    setup do
      @old_alerts_enabled = ENV["RLS_ALERTS_ENABLED"]
      @old_alerts_webhook = ENV["RLS_ALERTS_SLACK_WEBHOOK_URL"]
      @old_alerts_interval = ENV["RLS_ALERTS_MIN_INTERVAL_SECONDS"]
      @old_auth_warn = ENV["RLS_AUTH_LINK_ERROR_WARN"]

      ENV["RLS_ALERTS_ENABLED"] = "true"
      ENV["RLS_ALERTS_SLACK_WEBHOOK_URL"] = ""
      ENV["RLS_ALERTS_MIN_INTERVAL_SECONDS"] = "60"
      ENV["RLS_AUTH_LINK_ERROR_WARN"] = "1"
    end

    teardown do
      ENV["RLS_ALERTS_ENABLED"] = @old_alerts_enabled
      ENV["RLS_ALERTS_SLACK_WEBHOOK_URL"] = @old_alerts_webhook
      ENV["RLS_ALERTS_MIN_INTERVAL_SECONDS"] = @old_alerts_interval
      ENV["RLS_AUTH_LINK_ERROR_WARN"] = @old_auth_warn
    end

    test "auth link error threshold sets active alert state" do
      monitor = Ops::Monitor.new(now: Time.current)
      monitor.record_auth_link_error!(context: { reason: "simulated" })

      state = OpsAlertState.find_by(code: "API_AUTH_LINK_ERRORS_HIGH", fingerprint: "global")
      assert_not_nil state
      assert_equal true, state.active
      assert_equal "warning", state.active_level
      assert_not_nil state.last_emitted_at
    end

    test "recovery is emitted only after a full interval below warn threshold" do
      travel_to(Time.zone.parse("2026-02-19T12:00:00Z")) do
        monitor = Ops::Monitor.new(now: Time.current)
        monitor.record_auth_link_error!(context: { reason: "simulated" })

        active_state = OpsAlertState.find_by(code: "API_AUTH_LINK_ERRORS_HIGH", fingerprint: "global")
        assert_equal true, active_state.active

        travel 16.minutes
        Ops::Monitor.new(now: Time.current).evaluate_auth_link_errors!

        active_state.reload
        assert_equal true, active_state.active
        assert_not_nil active_state.recovery_started_at

        travel 61.seconds
        Ops::Monitor.new(now: Time.current).evaluate_auth_link_errors!

        active_state.reload
        assert_equal false, active_state.active
        assert_equal "normal", active_state.active_level
        assert_not_nil active_state.last_recovered_at

        recovered_state = OpsAlertState.find_by(code: "API_AUTH_LINK_ERRORS_HIGH_RECOVERED", fingerprint: "global")
        assert_not_nil recovered_state
        assert_not_nil recovered_state.last_emitted_at
      end
    end
  end
end
