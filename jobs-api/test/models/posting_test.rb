require "test_helper"

class PostingTest < ActiveSupport::TestCase
  test "job title prefers structured fields then payload fallback" do
    posting = Posting.new(
      kind: "job_posting",
      role_title: "Senior Engineer",
      company_name: "Pied Piper",
      values_payload: { roleTitle: "Ignored", companyName: "Ignored" }.to_json,
      last_payload: "{}",
      external_posting_id: "p-1",
      status: "active"
    )

    assert_equal "Senior Engineer at Pied Piper", posting.title

    posting.role_title = nil
    posting.company_name = nil
    assert_equal "Ignored at Ignored", posting.title
  end

  test "candidate title uses headline or payload fallback" do
    posting = Posting.new(
      kind: "candidate_profile",
      headline: "Staff Security Engineer",
      values_payload: { headline: "Fallback Headline" }.to_json,
      last_payload: "{}",
      external_posting_id: "p-2",
      status: "active"
    )

    assert_equal "Staff Security Engineer", posting.title
    posting.headline = nil
    assert_equal "Fallback Headline", posting.title
  end

  test "values_hash and payload_hash fail safe on bad json" do
    posting = Posting.new(
      kind: "job_posting",
      values_payload: "{bad json",
      last_payload: "{bad json",
      external_posting_id: "p-3",
      status: "active"
    )

    assert_equal({}, posting.values_hash)
    assert_equal({}, posting.last_payload_hash)
  end

  test "scopes separate active/archived and kind" do
    Posting.create!(
      external_posting_id: "job-active",
      kind: "job_posting",
      status: "active",
      values_payload: "{}",
      last_payload: "{}"
    )
    Posting.create!(
      external_posting_id: "job-archived",
      kind: "job_posting",
      status: "archived",
      values_payload: "{}",
      last_payload: "{}"
    )
    Posting.create!(
      external_posting_id: "candidate-active",
      kind: "candidate_profile",
      status: "active",
      values_payload: "{}",
      last_payload: "{}"
    )

    assert_equal 2, Posting.active.count
    assert_equal 1, Posting.archived.count
    assert_equal 2, Posting.jobs.count
    assert_equal 1, Posting.candidates.count
  end

  test "search_text_from_values composes normalized tokens" do
    text = Posting.search_text_from_values(
      {
        companyName: "Pied Piper",
        roleTitle: "Senior Engineer",
        workArrangements: ["remote", "hybrid"],
        compensationValue: "$200k",
        relationship: "hiring_manager"
      }
    )

    assert_includes text, "pied piper"
    assert_includes text, "senior engineer"
    assert_includes text, "remote hybrid"
    assert_includes text, "$200k"
  end

  test "resync_from_values updates normalized fields" do
    posting = Posting.create!(
      external_posting_id: "resync-1",
      kind: "job_posting",
      status: "active",
      values_payload: {
        companyName: "Hooli",
        roleTitle: "Staff Engineer",
        locationSummary: "Remote",
        compensationValue: "$210k",
        relationship: "hiring_manager",
        summary: "Build systems"
      }.to_json,
      last_payload: "{}"
    )

    posting.resync_from_values!
    posting.reload

    assert_equal "Hooli", posting.company_name
    assert_equal "Staff Engineer", posting.role_title
    assert_equal "Remote", posting.location_summary
    assert_match(/build systems/i, posting.search_text)
  end
end
