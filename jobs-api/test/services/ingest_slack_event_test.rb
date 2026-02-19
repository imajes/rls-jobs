require "test_helper"

class IngestSlackEventTest < ActiveSupport::TestCase
  def base_payload
    {
      eventType: "slack_post_published",
      kind: "job_posting",
      previewId: "preview-1",
      postingId: "posting-1",
      postedAt: "2026-02-19T10:00:00Z",
      route: {
        channelFocus: "onsite_jobs",
        channelId: "C1",
        channelLabel: "#onsite-jobs"
      },
      slack: {
        teamId: "T1",
        previewDmChannelId: "D1",
        previewDmMessageTs: "100.1",
        publishedMessageTs: "100.2",
        publishedByUserId: "U1"
      },
      values: {
        companyName: "Pied Piper",
        roleTitle: "Senior Platform Engineer",
        locationSummary: "Hybrid in NYC",
        compensationValue: "$180k-$220k",
        relationship: "hiring_manager",
        posterUserId: "U1"
      }
    }
  end

  test "ingests valid payload into posting and event" do
    result = IngestSlackEvent.new(payload: base_payload).call

    assert_equal [], result.errors
    assert_equal false, result.duplicate
    assert_equal "posting-1", result.posting.external_posting_id
    assert_equal "Pied Piper", result.posting.company_name
    assert_equal 1, Posting.count
    assert_equal 1, IntakeEvent.count
  end

  test "returns duplicate for replayed payload" do
    first = IngestSlackEvent.new(payload: base_payload).call
    second = IngestSlackEvent.new(payload: base_payload).call

    assert_equal false, first.duplicate
    assert_equal true, second.duplicate
    assert_equal 1, Posting.count
    assert_equal 1, IntakeEvent.count
  end

  test "applies archived state on archive event" do
    IngestSlackEvent.new(payload: base_payload).call

    archive_payload = base_payload.merge(
      eventType: "slack_post_archived",
      archivedAt: "2026-02-19T11:00:00Z",
      archivedByUserId: "UARCHIVE"
    )

    result = IngestSlackEvent.new(payload: archive_payload).call

    assert_equal false, result.duplicate
    assert_equal "archived", result.posting.status
    assert_equal "UARCHIVE", result.posting.archived_by_user_id
    assert_not_nil result.posting.archived_at
    assert_equal 2, IntakeEvent.count
  end

  test "validates payload shape" do
    result = IngestSlackEvent.new(payload: { foo: "bar" }).call

    assert_equal true, result.errors.any?
    assert_nil result.posting
    assert_equal 0, Posting.count
    assert_equal 0, IntakeEvent.count
  end

  test "falls back external posting id when postingId missing" do
    payload = base_payload.except(:postingId)
    payload[:route][:channelId] = "C123"
    payload[:kind] = "candidate_profile"

    result = IngestSlackEvent.new(payload: payload).call
    assert_equal "preview-1:C123:candidate_profile", result.posting.external_posting_id
  end
end
