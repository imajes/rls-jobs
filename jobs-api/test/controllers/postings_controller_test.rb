require "test_helper"

class PostingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @job = Posting.create!(
      external_posting_id: "posting_job_100",
      kind: "job_posting",
      status: "active",
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
      headline: "Staff Security Engineer",
      location_summary: "Remote, US",
      visa_policy: "unknown",
      relationship: "candidate_self",
      summary: "Security architecture and cloud hardening",
      search_text: "staff security engineer remote us",
      values_payload: { headline: "Staff Security Engineer" }.to_json,
      last_payload: { eventType: "slack_post_published" }.to_json
    )
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
end
