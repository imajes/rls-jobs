require "test_helper"

class AuthLinkTest < ActiveSupport::TestCase
  test "issue stores digest and returns raw token" do
    link, raw = AuthLink.issue!(
      slack_user_id: "U123",
      slack_team_id: "T123",
      slack_user_name: "james",
      ttl: 5.minutes
    )

    assert_not_nil raw
    assert_not_empty raw
    assert_not_equal raw, link.token_digest
    assert_equal AuthLink.digest(raw), link.token_digest
  end

  test "find_by_token resolves issued link" do
    link, raw = AuthLink.issue!(
      slack_user_id: "U123",
      slack_team_id: "T123",
      slack_user_name: "james",
      ttl: 5.minutes
    )

    found = AuthLink.find_by_token(raw)
    assert_equal link.id, found.id
    assert_nil AuthLink.find_by_token("not-a-token")
  end

  test "redeem is single use" do
    link, _raw = AuthLink.issue!(
      slack_user_id: "U123",
      slack_team_id: "T123",
      slack_user_name: "james",
      ttl: 5.minutes
    )

    assert_equal true, link.redeem!(request_ip: "127.0.0.1")
    assert_not_nil link.reload.consumed_at
    assert_equal false, link.redeem!(request_ip: "127.0.0.1")
  end

  test "expired returns true when expiry has passed" do
    link = AuthLink.create!(
      token_digest: AuthLink.digest("abc"),
      slack_user_id: "U1",
      slack_team_id: "T1",
      expires_at: 1.minute.ago
    )

    assert_equal true, link.expired?
  end
end
