require "test_helper"

module Admin
  class PostingsControllerTest < ActionDispatch::IntegrationTest
    setup do
      @old_admin_env = ENV["RLS_ADMIN_SLACK_USER_IDS"]
      ENV["RLS_ADMIN_SLACK_USER_IDS"] = "UADMIN"

      @posting = Posting.create!(
        external_posting_id: "admin-posting-1",
        kind: "job_posting",
        status: "active",
        company_name: "Pied Piper",
        role_title: "Platform Engineer",
        values_payload: {
          companyName: "Pied Piper",
          roleTitle: "Platform Engineer",
          summary: "Original summary"
        }.to_json,
        last_payload: { eventType: "slack_post_published" }.to_json,
        search_text: "pied piper platform engineer"
      )

      authenticate!("UADMIN")
    end

    teardown do
      ENV["RLS_ADMIN_SLACK_USER_IDS"] = @old_admin_env
    end

    test "admin can load index" do
      get admin_postings_path
      assert_response :success
      assert_includes response.body, "Admin results"
      assert_includes response.body, "Moderation"
    end

    test "non-admin is redirected" do
      delete auth_logout_path
      authenticate!("UNONADMIN")

      get admin_postings_path
      assert_redirected_to postings_path
    end

    test "admin can update posting and values payload json" do
      patch admin_posting_path(@posting), params: {
        posting: {
          status: "active",
          company_name: "Hooli",
          role_title: "Staff Engineer",
          headline: "",
          location_summary: "Remote",
          compensation_value: "$200k",
          visa_policy: "yes",
          relationship: "hiring_manager",
          skills: "Ruby",
          summary: "Updated summary",
          channel_focus: "remote_jobs",
          channel_label: "#remote-jobs",
          permalink: "https://slack.example/test",
          values_payload_json: {
            companyName: "Hooli",
            roleTitle: "Staff Engineer",
            summary: "Updated from json"
          }.to_json
        }
      }

      assert_redirected_to edit_admin_posting_path(@posting)
      posting = @posting.reload
      assert_equal "Hooli", posting.company_name
      assert_equal "Staff Engineer", posting.role_title
      assert_match(/updated from json/i, posting.search_text)
    end

    test "invalid values payload json returns unprocessable" do
      patch admin_posting_path(@posting), params: {
        posting: {
          status: "active",
          values_payload_json: "{bad-json"
        }
      }

      assert_response :unprocessable_entity
      assert_includes response.body, "valid JSON"
    end

    test "cleanup_archived deletes stale archived postings" do
      stale = Posting.create!(
        external_posting_id: "archived-old",
        kind: "job_posting",
        status: "archived",
        archived_at: 120.days.ago,
        values_payload: "{}",
        last_payload: "{}"
      )
      fresh = Posting.create!(
        external_posting_id: "archived-fresh",
        kind: "job_posting",
        status: "archived",
        archived_at: 5.days.ago,
        values_payload: "{}",
        last_payload: "{}"
      )

      delete cleanup_archived_admin_postings_path, params: { days: 30 }

      assert_redirected_to admin_postings_path
      assert_nil Posting.find_by(id: stale.id)
      assert_not_nil Posting.find_by(id: fresh.id)
    end

    test "mark_reviewed updates moderation fields" do
      patch mark_reviewed_admin_posting_path(@posting)

      assert_redirected_to admin_postings_path
      @posting.reload
      assert_equal "reviewed", @posting.moderation_state
      assert_equal "UADMIN", @posting.moderation_reviewed_by
      assert_not_nil @posting.moderation_last_reviewed_at
    end

    test "clear_flag resets moderation flag" do
      @posting.update!(moderation_flagged: true, moderation_state: "unreviewed", moderation_reason: "new account")

      patch clear_flag_admin_posting_path(@posting)

      assert_redirected_to admin_postings_path
      @posting.reload
      assert_equal false, @posting.moderation_flagged
      assert_equal "cleared", @posting.moderation_state
      assert_nil @posting.moderation_reason
    end

    test "escalate sets moderation to escalated" do
      patch escalate_admin_posting_path(@posting)

      assert_redirected_to admin_postings_path
      @posting.reload
      assert_equal true, @posting.moderation_flagged
      assert_equal "escalated", @posting.moderation_state
      assert_equal "UADMIN", @posting.moderation_reviewed_by
    end

    private

    def authenticate!(slack_user_id)
      _link, token = AuthLink.issue!(
        slack_user_id: slack_user_id,
        slack_team_id: "TADMIN",
        slack_user_name: "admin",
        ttl: 10.minutes
      )

      get auth_slack_redeem_path(token: token)
      assert_redirected_to postings_path
    end
  end
end
