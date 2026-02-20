require "test_helper"

class OpsEventTest < ActiveSupport::TestCase
  test "record! persists structured context" do
    event = OpsEvent.record!(
      code: "api_auth_link_error",
      severity: "warning",
      context: { reason: "missing_required_fields", count: 1 },
      occurred_at: Time.current,
    )

    assert_equal "api_auth_link_error", event.code
    assert_equal "warning", event.severity
    assert_equal "missing_required_fields", event.context_hash["reason"]
  end
end
