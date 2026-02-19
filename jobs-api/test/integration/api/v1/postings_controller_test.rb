require "test_helper"

module Api
  module V1
    class PostingsControllerTest < ActionDispatch::IntegrationTest
      setup do
        @old_token = ENV["RLS_JOBS_API_TOKEN"]
        ENV["RLS_JOBS_API_TOKEN"] = "test-shared-token"

        @job = Posting.create!(
          external_posting_id: "posting-job-200",
          kind: "job_posting",
          status: "active",
          poster_user_id: "UPOSTER1",
          team_id: "T1",
          channel_id: "C1",
          channel_focus: "jobs",
          published_message_ts: "123.456",
          values_payload: {
            companyName: "Pied Piper",
            roleTitle: "Platform Engineer",
            posterUserId: "UPOSTER1"
          }.to_json,
          last_payload: { eventType: "slack_post_published" }.to_json
        )

        @candidate = Posting.create!(
          external_posting_id: "posting-candidate-200",
          kind: "candidate_profile",
          status: "archived",
          poster_user_id: "UPOSTER1",
          team_id: "T1",
          channel_id: "C2",
          channel_focus: "remote_jobs",
          moderation_flagged: true,
          moderation_state: "unreviewed",
          values_payload: {
            headline: "Security engineer",
            posterUserId: "UPOSTER1"
          }.to_json,
          last_payload: { eventType: "slack_post_archived" }.to_json
        )
      end

      teardown do
        ENV["RLS_JOBS_API_TOKEN"] = @old_token
      end

      test "lists postings for poster and status filter" do
        get api_v1_postings_path,
            params: { poster_user_id: "UPOSTER1", status: "active", limit: 10 },
            headers: auth_headers

        assert_response :success
        body = JSON.parse(response.body)
        assert_equal true, body["ok"]
        assert_equal 1, body["count"]
        assert_equal "posting-job-200", body["postings"].first["external_posting_id"]
      end

      test "shows posting by external id" do
        get api_v1_posting_path(external_posting_id: @candidate.external_posting_id), headers: auth_headers

        assert_response :success
        body = JSON.parse(response.body)
        assert_equal true, body["ok"]
        assert_equal @candidate.external_posting_id, body.dig("posting", "external_posting_id")
        assert_equal true, body.dig("posting", "moderation", "flagged")
      end

      test "rejects unauthorized requests" do
        get api_v1_postings_path
        assert_response :unauthorized
      end

      private

      def auth_headers
        { "Authorization" => "Bearer test-shared-token" }
      end
    end
  end
end
