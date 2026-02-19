require "test_helper"

class IngestFailureTest < ActiveSupport::TestCase
  test "record! creates and increments repeated fingerprint" do
    payload = { eventType: "slack_post_published", kind: "job_posting", values: {} }

    first = IngestFailure.record!(
      event_fingerprint: "abc123",
      event_type: payload[:eventType],
      kind: payload[:kind],
      payload: payload,
      reason: "bad payload"
    )

    second = IngestFailure.record!(
      event_fingerprint: "abc123",
      event_type: payload[:eventType],
      kind: payload[:kind],
      payload: payload,
      reason: "bad payload again"
    )

    assert_equal first.id, second.id
    assert_equal 2, second.failure_count
    assert_equal "bad payload again", second.reason
  end

  test "resolve_for_fingerprint marks unresolved rows" do
    failure = IngestFailure.record!(
      event_fingerprint: "resolve-me",
      event_type: "slack_post_updated",
      kind: "job_posting",
      payload: { eventType: "slack_post_updated" },
      reason: "temporary outage"
    )

    assert_nil failure.resolved_at
    IngestFailure.resolve_for_fingerprint!("resolve-me")

    assert_not_nil failure.reload.resolved_at
  end
end
