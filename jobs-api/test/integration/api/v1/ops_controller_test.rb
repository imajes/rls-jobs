require "test_helper"

module Api
  module V1
    class OpsControllerTest < ActionDispatch::IntegrationTest
      setup do
        @old_token = ENV["RLS_JOBS_API_TOKEN"]
        ENV["RLS_JOBS_API_TOKEN"] = "test-shared-token"

        Posting.create!(
          external_posting_id: "ops-posting-1",
          kind: "job_posting",
          status: "active",
          moderation_flagged: true,
          moderation_state: "escalated",
          values_payload: { companyName: "Pied Piper", roleTitle: "SRE" }.to_json,
          last_payload: { eventType: "slack_post_published" }.to_json,
        )

        IntakeEvent.create!(
          event_fingerprint: "ops-fingerprint-1",
          event_type: "slack_post_published",
          kind: "job_posting",
          source: "slack_app",
          payload: { eventType: "slack_post_published", kind: "job_posting", values: {}, route: {}, slack: {}, postingId: "ops-posting-1" }.to_json,
          received_at: Time.current,
        )

        IngestFailure.record!(
          event_fingerprint: "ops-failure-1",
          event_type: "slack_post_published",
          kind: "job_posting",
          payload: { bad: true },
          reason: "simulated",
        )

        OpsEvent.record!(code: Ops::Monitor::AUTH_LINK_ERROR_EVENT, context: { reason: "simulated" })
      end

      teardown do
        ENV["RLS_JOBS_API_TOKEN"] = @old_token
      end

      test "requires bearer token" do
        get "/api/v1/ops/summary"
        assert_response :unauthorized
      end

      test "returns ops summary payload" do
        get "/api/v1/ops/summary", headers: { "Authorization" => "Bearer test-shared-token" }

        assert_response :success
        body = JSON.parse(response.body)
        assert_equal true, body["ok"]
        summary = body["summary"]
        assert_equal "normal", summary["operation_mode"]
        assert_operator summary["unresolved_ingest_failures"], :>=, 1
        assert_operator summary["intake_volume_24h"], :>=, 1
        assert_operator summary["auth_link_failures_24h"], :>=, 1
      end
    end
  end
end
