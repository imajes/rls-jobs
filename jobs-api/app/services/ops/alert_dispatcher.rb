require "json"
require "net/http"
require "uri"

module Ops
  class AlertDispatcher
    DEFAULT_MIN_INTERVAL_SECONDS = 900

    def initialize(service:, logger: Rails.logger, now: Time.current)
      @service = service
      @logger = logger
      @now = now
    end

    def min_interval_seconds
      value = ENV.fetch("RLS_ALERTS_MIN_INTERVAL_SECONDS", DEFAULT_MIN_INTERVAL_SECONDS.to_s).to_i
      value.positive? ? value : DEFAULT_MIN_INTERVAL_SECONDS
    end

    def alerts_enabled?
      parse_bool(ENV.fetch("RLS_ALERTS_ENABLED", "true"))
    end

    def emit(severity:, code:, message:, context: {}, fingerprint: "global", dedupe: true)
      alert = {
        service: service,
        severity: normalize_severity(severity),
        code: code,
        message: message,
        context: context || {},
        fingerprint: fingerprint.presence || "global",
        detected_at: now.utc.iso8601,
      }

      log_alert(alert)
      return alert.merge(delivered: false, reason: "alerts_disabled") unless alerts_enabled?

      state = OpsAlertState.fetch(code: alert[:code], fingerprint: alert[:fingerprint])
      if dedupe && state.persisted? && state.last_emitted_at.present? && state.last_emitted_at > min_interval_seconds.seconds.ago
        state.last_observed_at = now
        state.last_value = (context || {})[:value].to_i if (context || {}).key?(:value)
        state.save!
        return alert.merge(delivered: false, deduped: true)
      end

      delivery = deliver_to_slack(alert)
      state.last_observed_at = now
      state.last_emitted_at = now
      state.last_value = (context || {})[:value].to_i if (context || {}).key?(:value)
      state.save!

      alert.merge(delivered: delivery[:ok], reason: delivery[:reason], deduped: false)
    end

    private

    attr_reader :service, :logger, :now

    def normalize_severity(severity)
      severity.to_s == "critical" ? "critical" : "warning"
    end

    def parse_bool(raw)
      %w[1 true yes on].include?(raw.to_s.strip.downcase)
    end

    def log_alert(alert)
      level = alert[:severity] == "critical" ? :error : :warn
      logger.public_send(level, "alert_event #{alert.to_json}")
    end

    def deliver_to_slack(alert)
      webhook = ENV.fetch("RLS_ALERTS_SLACK_WEBHOOK_URL", "").to_s.strip
      if webhook.blank?
        logger.error(
          "ALERT_DELIVERY_FAILED #{ { service: service, code: alert[:code], fingerprint: alert[:fingerprint], reason: "missing_webhook" }.to_json }"
        )
        return { ok: false, reason: "missing_webhook" }
      end

      uri = URI.parse(webhook)
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request.body = {
        text: "[#{alert[:severity].upcase}] #{alert[:code]}: #{alert[:message]}",
        blocks: slack_blocks(alert),
      }.to_json

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", read_timeout: 5, open_timeout: 5) do |http|
        http.request(request)
      end

      if response.code.to_i >= 400
        logger.error(
          "ALERT_DELIVERY_FAILED #{ { service: service, code: alert[:code], fingerprint: alert[:fingerprint], status: response.code.to_i }.to_json }"
        )
        return { ok: false, reason: "http_#{response.code}" }
      end

      { ok: true, reason: "" }
    rescue StandardError => e
      logger.error(
        "ALERT_DELIVERY_FAILED #{ { service: service, code: alert[:code], fingerprint: alert[:fingerprint], error: e.message }.to_json }"
      )
      { ok: false, reason: "network_error" }
    end

    def slack_blocks(alert)
      context_lines = if alert[:context].present?
        alert[:context].map { |key, value| "• #{key}: #{value}" }
      else
        ["• none"]
      end

      [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*#{alert[:severity].upcase}* `#{alert[:code]}`\n#{alert[:message]}",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Service:* #{alert[:service]}\n*Fingerprint:* `#{alert[:fingerprint]}`\n*Detected at:* #{alert[:detected_at]}",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Context*\n#{context_lines.join("\n")}",
          },
        },
      ]
    end
  end
end
