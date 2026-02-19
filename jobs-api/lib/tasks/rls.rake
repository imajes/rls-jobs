namespace :rls do
  desc 'Replay failed ingest events. Usage: bin/rails rls:replay_ingest_failures DRY_RUN=true LIMIT=50 ID=123'
  task replay_ingest_failures: :environment do
    dry_run = ENV.fetch('DRY_RUN', 'true').to_s.downcase != 'false'
    limit = ENV.fetch('LIMIT', '50').to_i
    include_resolved = ENV.fetch('INCLUDE_RESOLVED', 'false').to_s.downcase == 'true'
    target_id = ENV['ID'].presence

    scope = include_resolved ? IngestFailure.all : IngestFailure.unresolved
    scope = scope.where(id: target_id) if target_id
    failures = scope.recent_first.limit(limit)

    puts "replay_start dry_run=#{dry_run} limit=#{limit} target_id=#{target_id || 'none'} count=#{failures.count}"

    failures.each do |failure|
      if dry_run
        puts "dry_run id=#{failure.id} fingerprint=#{failure.event_fingerprint} reason=#{failure.reason}"
        next
      end

      result = IngestSlackEvent.new(payload: failure.payload_hash).call
      if result.errors.any?
        puts "replay_failed id=#{failure.id} errors=#{result.errors.join(' | ')}"
        next
      end

      failure.update!(
        replayed_at: Time.current,
        resolved_at: Time.current
      )
      puts "replay_ok id=#{failure.id} duplicate=#{result.duplicate} posting=#{result.posting&.external_posting_id}"
    end

    puts 'replay_complete'
  end
end
