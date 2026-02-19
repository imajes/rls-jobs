require "test_helper"

module Api
  module V1
    class IntakeControllerTest < ActionDispatch::IntegrationTest
      setup do
        @old_token = ENV["RLS_JOBS_API_TOKEN"]
        ENV["RLS_JOBS_API_TOKEN"] = "test-shared-token"
      end

      teardown do
        ENV["RLS_JOBS_API_TOKEN"] = @old_token
      end

      test "creates posting and intake event" do
        post api_v1_intake_path,
             params: base_payload.to_json,
             headers: json_headers

        assert_response :created
        body = JSON.parse(response.body)
        assert_equal true, body["ok"]
        assert_equal false, body["duplicate"]

        posting = Posting.find_by(external_posting_id: base_payload["postingId"])
        assert_not_nil posting
        assert_equal "job_posting", posting.kind
        assert_equal "active", posting.status
        assert_equal "Pied Piper", posting.company_name
        assert_equal 1, IntakeEvent.count
      end

      test "deduplicates repeated payload" do
        post api_v1_intake_path,
             params: base_payload.to_json,
             headers: json_headers
        assert_response :created

        post api_v1_intake_path,
             params: base_payload.to_json,
             headers: json_headers

        assert_response :ok
        body = JSON.parse(response.body)
        assert_equal true, body["duplicate"]
        assert_equal 1, Posting.count
        assert_equal 1, IntakeEvent.count
      end

      test "archives existing posting when archive event arrives" do
        post api_v1_intake_path,
             params: base_payload.to_json,
             headers: json_headers
        assert_response :created

        payload = base_payload.merge(
          "eventType" => "slack_post_archived",
          "archivedAt" => "2026-02-19T09:15:00Z",
          "archivedByUserId" => "UARCHIVER"
        )

        post api_v1_intake_path,
             params: payload.to_json,
             headers: json_headers

        assert_response :created
        posting = Posting.find_by(external_posting_id: base_payload["postingId"])
        assert_equal "archived", posting.status
        assert_equal "UARCHIVER", posting.archived_by_user_id
        assert_not_nil posting.archived_at
        assert_equal 2, IntakeEvent.count
      end

      test "rejects request when bearer token is missing" do
        post api_v1_intake_path,
             params: base_payload.to_json,
             headers: { "CONTENT_TYPE" => "application/json" }

        assert_response :unauthorized
        assert_equal 0, Posting.count
      end

      private

      def json_headers
        {
          "CONTENT_TYPE" => "application/json",
          "Authorization" => "Bearer test-shared-token"
        }
      end

      def base_payload
        {
          "eventType" => "slack_post_published",
          "kind" => "job_posting",
          "previewId" => "job_preview_001",
          "postingId" => "posting_job_001",
          "postedAt" => "2026-02-19T09:00:00Z",
          "route" => {
            "channelFocus" => "onsite_jobs",
            "channelId" => "C123ONSITE",
            "channelLabel" => "#onsite-jobs"
          },
          "slack" => {
            "teamId" => "T123",
            "previewDmChannelId" => "D123",
            "previewDmMessageTs" => "1739955600.100000",
            "publishedMessageTs" => "1739955660.100000",
            "publishedByUserId" => "U123POSTER"
          },
          "values" => {
            "companyName" => "Pied Piper",
            "roleTitle" => "Senior Platform Engineer",
            "locationSummary" => "Hybrid in NYC (2 days onsite)",
            "workArrangements" => ["hybrid", "onsite"],
            "employmentTypes" => ["full_time"],
            "compensationValue" => "$185k-$230k USD",
            "relationship" => "hiring_manager",
            "skills" => "Ruby, Postgres, AWS",
            "summary" => "Build scalable infra systems",
            "posterUserId" => "U123POSTER"
          }
        }
      end
    end
  end
end
