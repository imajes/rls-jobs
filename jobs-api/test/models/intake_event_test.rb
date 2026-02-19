require "test_helper"

class IntakeEventTest < ActiveSupport::TestCase
  test "payload_hash parses json" do
    event = IntakeEvent.new(
      event_fingerprint: "abc123",
      event_type: "slack_post_published",
      kind: "job_posting",
      source: "slack_app",
      received_at: Time.current,
      payload: { eventType: "slack_post_published" }.to_json
    )

    assert_equal "slack_post_published", event.payload_hash["eventType"]
  end

  test "payload_hash fails safe on invalid json" do
    event = IntakeEvent.new(
      event_fingerprint: "abc1234",
      event_type: "slack_post_published",
      kind: "job_posting",
      source: "slack_app",
      received_at: Time.current,
      payload: "{bad"
    )

    assert_equal({}, event.payload_hash)
  end
end
