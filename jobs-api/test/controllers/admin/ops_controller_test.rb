require "test_helper"

module Admin
  class OpsControllerTest < ActionDispatch::IntegrationTest
    setup do
      @old_admin_env = ENV["RLS_ADMIN_SLACK_USER_IDS"]
      ENV["RLS_ADMIN_SLACK_USER_IDS"] = "UADMIN"

      Posting.create!(
        external_posting_id: "ops-admin-posting-1",
        kind: "job_posting",
        status: "active",
        moderation_flagged: true,
        moderation_state: "unreviewed",
        values_payload: { companyName: "Hooli", roleTitle: "Staff Engineer" }.to_json,
        last_payload: { eventType: "slack_post_published" }.to_json,
      )

      authenticate!("UADMIN")
    end

    teardown do
      ENV["RLS_ADMIN_SLACK_USER_IDS"] = @old_admin_env
    end

    test "admin can open ops dashboard" do
      get admin_ops_path

      assert_response :success
      assert_includes response.body, "RLS Jobs Ops Dashboard"
      assert_includes response.body, "Unresolved ingest failures"
    end

    test "non admin is redirected" do
      delete auth_logout_path
      authenticate!("UNONADMIN")

      get admin_ops_path
      assert_redirected_to postings_path
    end

    private

    def authenticate!(slack_user_id)
      _link, token = AuthLink.issue!(
        slack_user_id: slack_user_id,
        slack_team_id: "TADMIN",
        slack_user_name: "admin",
        ttl: 10.minutes,
      )

      get auth_slack_redeem_path(token: token)
      assert_redirected_to postings_path
    end
  end
end
