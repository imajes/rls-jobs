require "test_helper"

module Api
  module V1
    class AuthLinksControllerTest < ActionDispatch::IntegrationTest
      setup do
        @old_token = ENV["RLS_JOBS_API_TOKEN"]
        @old_base = ENV["RLS_JOBS_WEB_BASE_URL"]
        ENV["RLS_JOBS_API_TOKEN"] = "test-shared-token"
        ENV["RLS_JOBS_WEB_BASE_URL"] = "https://jobs.rls.example"
      end

      teardown do
        ENV["RLS_JOBS_API_TOKEN"] = @old_token
        ENV["RLS_JOBS_WEB_BASE_URL"] = @old_base
      end

      test "creates one-time auth link" do
        post api_v1_auth_links_path,
             params: {
               slack_user_id: "U123",
               slack_team_id: "T123",
               slack_user_name: "james"
             },
             as: :json,
             headers: { "Authorization" => "Bearer test-shared-token" }

        assert_response :created
        body = JSON.parse(response.body)
        assert_equal true, body["ok"]
        assert_match %r{\Ahttps://jobs\.rls\.example/auth/slack/}, body["auth_url"]
        assert_equal 1, AuthLink.count
      end

      test "rejects create without bearer token" do
        post api_v1_auth_links_path,
             params: { slack_user_id: "U123", slack_team_id: "T123" },
             as: :json

        assert_response :unauthorized
      end

      test "rejects create with wrong bearer token" do
        post api_v1_auth_links_path,
             params: { slack_user_id: "U123", slack_team_id: "T123" },
             as: :json,
             headers: { "Authorization" => "Bearer wrong-token" }

        assert_response :unauthorized
      end

      test "validates required slack ids" do
        post api_v1_auth_links_path,
             params: { slack_user_name: "james" },
             as: :json,
             headers: { "Authorization" => "Bearer test-shared-token" }

        assert_response :unprocessable_entity
        body = JSON.parse(response.body)
        assert_equal false, body["ok"]
        assert_equal 1, OpsEvent.for_code(Ops::Monitor::AUTH_LINK_ERROR_EVENT).count
      end
    end
  end
end
