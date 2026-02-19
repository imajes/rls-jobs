require "test_helper"

class AuthControllerTest < ActionDispatch::IntegrationTest
  include ActiveSupport::Testing::TimeHelpers

  setup do
    Posting.create!(
      external_posting_id: "posting_job_auth_test",
      kind: "job_posting",
      status: "active",
      company_name: "Pied Piper",
      role_title: "Platform Engineer",
      search_text: "pied piper platform engineer",
      values_payload: { companyName: "Pied Piper" }.to_json,
      last_payload: { eventType: "slack_post_published" }.to_json
    )
  end

  test "redeems valid one-time token and grants access" do
    _link, token = AuthLink.issue!(
      slack_user_id: "U999",
      slack_team_id: "T999",
      slack_user_name: "alice",
      ttl: 10.minutes
    )

    get auth_slack_redeem_path(token: token)

    assert_redirected_to postings_path
    follow_redirect!
    assert_response :success
    assert_includes response.body, "Verified as"
  end

  test "rejects already-consumed token" do
    link, token = AuthLink.issue!(
      slack_user_id: "U999",
      slack_team_id: "T999",
      slack_user_name: "alice",
      ttl: 10.minutes
    )
    link.update!(consumed_at: Time.current)

    get auth_slack_redeem_path(token: token)

    assert_redirected_to auth_required_path
  end

  test "idle timeout expires session when user is inactive" do
    _link, token = AuthLink.issue!(
      slack_user_id: "U111",
      slack_team_id: "T111",
      slack_user_name: "bob",
      ttl: 10.minutes
    )

    get auth_slack_redeem_path(token: token)
    assert_redirected_to postings_path

    travel 16.minutes
    get postings_path

    assert_redirected_to auth_required_path
  end

  test "hard cap expires session even with ongoing activity" do
    travel_to(Time.zone.parse("2026-02-19T10:00:00Z")) do
      _link, token = AuthLink.issue!(
        slack_user_id: "U222",
        slack_team_id: "T222",
        slack_user_name: "carol",
        ttl: 10.minutes
      )

      get auth_slack_redeem_path(token: token)
      assert_redirected_to postings_path

      travel 10.minutes
      get postings_path
      assert_response :success

      travel 14.minutes
      get postings_path
      assert_response :success

      travel 14.minutes
      get postings_path
      assert_response :success

      travel 14.minutes
      get postings_path
      assert_response :success

      travel 9.minutes
      get postings_path
      assert_redirected_to auth_required_path
    end
  end
end
