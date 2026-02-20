require "test_helper"

class OpsAlertStateTest < ActiveSupport::TestCase
  test "fetch returns existing state for code and fingerprint" do
    original = OpsAlertState.create!(
      code: "API_AUTH_LINK_ERRORS_HIGH",
      fingerprint: "global",
      active: true,
      active_level: "warning",
    )

    fetched = OpsAlertState.fetch(code: "API_AUTH_LINK_ERRORS_HIGH", fingerprint: "global")

    assert_equal original.id, fetched.id
    assert_equal true, fetched.active
  end
end
