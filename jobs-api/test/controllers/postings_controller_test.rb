require "test_helper"

class PostingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @old_operation_mode = ENV["RLS_OPERATION_MODE"]
    @old_beta_channel = ENV["RLS_CHANNEL_JOBS_BETA_ID"]
    ENV["RLS_OPERATION_MODE"] = "beta"
    ENV["RLS_CHANNEL_JOBS_BETA_ID"] = "CBETA"

    @job = Posting.create!(
      external_posting_id: "posting_job_100",
      kind: "job_posting",
      status: "active",
      channel_id: "CBETA",
      company_name: "Pied Piper",
      role_title: "Senior Platform Engineer",
      location_summary: "Hybrid in NYC",
      compensation_value: "$180k-$220k",
      visa_policy: "case_by_case",
      relationship: "hiring_manager",
      summary: "Build reliable distributed systems",
      search_text: "pied piper senior platform engineer hybrid nyc",
      values_payload: { companyName: "Pied Piper", roleTitle: "Senior Platform Engineer" }.to_json,
      last_payload: { eventType: "slack_post_published" }.to_json
    )

    @candidate = Posting.create!(
      external_posting_id: "posting_candidate_100",
      kind: "candidate_profile",
      status: "active",
      channel_id: "CBETA",
      headline: "Staff Security Engineer",
      location_summary: "Remote, US",
      visa_policy: "unknown",
      relationship: "candidate_self",
      summary: "Security architecture and cloud hardening",
      search_text: "staff security engineer remote us",
      values_payload: { headline: "Staff Security Engineer" }.to_json,
      last_payload: { eventType: "slack_post_published" }.to_json
    )

    authenticate!
  end

  teardown do
    ENV["RLS_OPERATION_MODE"] = @old_operation_mode
    ENV["RLS_CHANNEL_JOBS_BETA_ID"] = @old_beta_channel
  end

  test "index loads successfully" do
    get postings_path
    assert_response :success
    assert_includes response.body, "RLS Job Listings"
    assert_includes response.body, @job.role_title
  end

  test "index filters by kind and search term" do
    get postings_path, params: { kind: "candidate_profile", q: "security" }
    assert_response :success
    assert_includes response.body, @candidate.headline
    refute_includes response.body, @job.role_title
  end

  test "show renders posting details" do
    get posting_path(@job)
    assert_response :success
    assert_includes response.body, @job.company_name
    assert_includes response.body, @job.role_title
  end

  test "requires rls session" do
    delete auth_logout_path
    get postings_path
    assert_redirected_to auth_required_path
  end

  test "beta mode defaults listings to beta channel and allows view all toggle" do
    off_scope = Posting.create!(
      external_posting_id: "posting_job_off_scope",
      kind: "job_posting",
      status: "active",
      channel_id: "COTHER",
      company_name: "Octocorp",
      role_title: "Generalist",
      search_text: "octocorp generalist",
      values_payload: { companyName: "Octocorp", roleTitle: "Generalist" }.to_json,
      last_payload: { eventType: "slack_post_published" }.to_json,
    )

    get postings_path
    assert_response :success
    refute_includes response.body, off_scope.role_title

    get postings_path, params: { scope: "all" }
    assert_response :success
    assert_includes response.body, off_scope.role_title
  end

  private

  def authenticate!
    _link, token = AuthLink.issue!(
      slack_user_id: "UTEST",
      slack_team_id: "TTEST",
      slack_user_name: "tester",
      ttl: 10.minutes
    )

    get auth_slack_redeem_path(token: token)
    assert_redirected_to postings_path
  end
end
