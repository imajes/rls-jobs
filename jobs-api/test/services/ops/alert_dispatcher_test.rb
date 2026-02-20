require "test_helper"

module Ops
  class AlertDispatcherTest < ActiveSupport::TestCase
    LoggerStub = Struct.new(:warnings, :errors, keyword_init: true) do
      def warn(message)
        self.warnings << message
      end

      def error(message)
        self.errors << message
      end
    end

    setup do
      @old_alerts_enabled = ENV["RLS_ALERTS_ENABLED"]
      @old_alerts_webhook = ENV["RLS_ALERTS_SLACK_WEBHOOK_URL"]
      @old_alerts_interval = ENV["RLS_ALERTS_MIN_INTERVAL_SECONDS"]

      ENV["RLS_ALERTS_ENABLED"] = "true"
      ENV["RLS_ALERTS_SLACK_WEBHOOK_URL"] = ""
      ENV["RLS_ALERTS_MIN_INTERVAL_SECONDS"] = "900"
    end

    teardown do
      ENV["RLS_ALERTS_ENABLED"] = @old_alerts_enabled
      ENV["RLS_ALERTS_SLACK_WEBHOOK_URL"] = @old_alerts_webhook
      ENV["RLS_ALERTS_MIN_INTERVAL_SECONDS"] = @old_alerts_interval
    end

    test "logs canonical alert and delivery failure when webhook missing" do
      logger = LoggerStub.new(warnings: [], errors: [])
      dispatcher = Ops::AlertDispatcher.new(service: "jobs-api", logger: logger, now: Time.current)

      result = dispatcher.emit(
        severity: "warning",
        code: "API_INTAKE_VALIDATION_ERRORS_HIGH",
        message: "Validation failures high.",
        context: { value: 30 },
      )

      assert_equal false, result[:delivered]
      assert_equal false, logger.warnings.empty?
      assert logger.warnings.any? { |line| line.include?("alert_event") }
      assert logger.errors.any? { |line| line.include?("ALERT_DELIVERY_FAILED") }
    end

    test "dedupes repeated alerts within interval" do
      logger = LoggerStub.new(warnings: [], errors: [])
      dispatcher = Ops::AlertDispatcher.new(service: "jobs-api", logger: logger, now: Time.current)

      first = dispatcher.emit(
        severity: "warning",
        code: "API_INTAKE_VALIDATION_ERRORS_HIGH",
        message: "Validation failures high.",
        context: { value: 30 },
      )
      second = dispatcher.emit(
        severity: "warning",
        code: "API_INTAKE_VALIDATION_ERRORS_HIGH",
        message: "Validation failures high.",
        context: { value: 31 },
      )

      assert_equal false, first[:deduped]
      assert_equal true, second[:deduped]
    end
  end
end
