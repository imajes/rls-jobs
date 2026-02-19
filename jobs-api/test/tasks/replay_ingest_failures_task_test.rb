require "test_helper"
require "rake"

class ReplayIngestFailuresTaskTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks if Rake::Task.tasks.empty?
    @task = Rake::Task["rls:replay_ingest_failures"]
    @original_env = ENV.to_hash
  end

  teardown do
    @task.reenable
    ENV.replace(@original_env)
  end

  test "dry run does not modify failures" do
    IngestFailure.record!(
      event_fingerprint: "task-dry-run",
      event_type: "slack_post_published",
      kind: "job_posting",
      payload: { eventType: "slack_post_published", kind: "job_posting", values: {}, route: {}, slack: {} },
      reason: "simulated"
    )

    ENV["DRY_RUN"] = "true"
    ENV["LIMIT"] = "10"
    @task.invoke

    failure = IngestFailure.find_by(event_fingerprint: "task-dry-run")
    assert_nil failure.replayed_at
    assert_nil failure.resolved_at
  end

  test "non-dry run replays failures" do
    payload = {
      eventType: "slack_post_published",
      kind: "job_posting",
      previewId: "preview-replay-1",
      postingId: "posting-replay-1",
      postedAt: "2026-02-19T10:00:00Z",
      route: { channelFocus: "jobs", channelId: "C1", channelLabel: "#jobs" },
      slack: { teamId: "T1", publishedByUserId: "U1", publishedMessageTs: "1.001" },
      values: { companyName: "Pied Piper", roleTitle: "Engineer", posterUserId: "U1" }
    }

    IngestFailure.record!(
      event_fingerprint: "task-replay-success",
      event_type: payload[:eventType],
      kind: payload[:kind],
      payload: payload,
      reason: "temporary outage"
    )

    ENV["DRY_RUN"] = "false"
    ENV["LIMIT"] = "10"
    @task.invoke

    failure = IngestFailure.find_by(event_fingerprint: "task-replay-success")
    assert_not_nil failure.replayed_at
    assert_not_nil failure.resolved_at
    assert_equal 1, Posting.where(external_posting_id: "posting-replay-1").count
  end
end
