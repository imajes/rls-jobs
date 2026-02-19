if ENV["COVERAGE"] == "1"
  require "coverage"
  require "json"
  require "fileutils"
  require "time"

  Coverage.start(lines: true, branches: true)

  at_exit do
    result = Coverage.result
    root = File.expand_path("..", __dir__)
    tracked = result.select do |path, _|
      path.start_with?(root) && (path.include?("/app/") || path.include?("/lib/"))
    end

    line_hits = 0
    line_total = 0
    branch_hits = 0
    branch_total = 0

    tracked.each_value do |entry|
      lines = entry.is_a?(Hash) ? (entry[:lines] || entry["lines"]) : entry
      if lines.respond_to?(:each)
        lines.each do |count|
          next unless count.is_a?(Integer)

          line_total += 1
          line_hits += 1 if count.positive?
        end
      end

      branches = entry.is_a?(Hash) ? (entry[:branches] || entry["branches"]) : nil
      next unless branches.respond_to?(:each_value)

      branches.each_value do |count|
        next unless count.is_a?(Integer)

        branch_total += 1
        branch_hits += 1 if count.positive?
      end
    end

    line_percent = line_total.zero? ? 100.0 : ((line_hits.to_f / line_total) * 100.0)
    branch_percent = branch_total.zero? ? 100.0 : ((branch_hits.to_f / branch_total) * 100.0)

    summary = {
      generated_at: Time.now.utc.iso8601,
      tracked_file_count: tracked.size,
      lines: {
        covered: line_hits,
        total: line_total,
        percent: line_percent.round(2),
      },
      branches: {
        covered: branch_hits,
        total: branch_total,
        percent: branch_percent.round(2),
      },
    }

    coverage_dir = File.join(root, "coverage")
    FileUtils.mkdir_p(coverage_dir)
    File.write(File.join(coverage_dir, "summary.json"), JSON.pretty_generate(summary))
    File.write(
      File.join(coverage_dir, "summary.txt"),
      "Lines: #{summary[:lines][:covered]}/#{summary[:lines][:total]} (#{summary[:lines][:percent]}%)\n" \
      "Branches: #{summary[:branches][:covered]}/#{summary[:branches][:total]} (#{summary[:branches][:percent]}%)\n",
    )

    puts "Coverage summary: lines=#{summary[:lines][:percent]}% branches=#{summary[:branches][:percent]}%"

    min_lines = ENV["COVERAGE_MIN_LINES"]&.to_f
    min_branches = ENV["COVERAGE_MIN_BRANCHES"]&.to_f
    failed = false

    if min_lines && line_percent < min_lines
      warn "Coverage threshold failed: lines #{line_percent.round(2)}% < #{min_lines}%"
      failed = true
    end

    if min_branches && branch_percent < min_branches
      warn "Coverage threshold failed: branches #{branch_percent.round(2)}% < #{min_branches}%"
      failed = true
    end

    exit(1) if failed
  end
end

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: 1)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end
