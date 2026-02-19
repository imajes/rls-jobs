require 'digest'
require 'json'

class IngestSlackEvent
  Result = Struct.new(:posting, :intake_event, :duplicate, :errors, keyword_init: true)

  EVENT_TYPES = %w[slack_post_published slack_post_updated slack_post_archived].freeze
  KINDS = %w[job_posting candidate_profile].freeze

  STATUS_BY_EVENT = {
    'slack_post_published' => 'active',
    'slack_post_updated' => 'active',
    'slack_post_archived' => 'archived'
  }.freeze

  def initialize(payload:, received_at: Time.current)
    @payload = payload.to_h.deep_stringify_keys
    @received_at = received_at
    @errors = []
  end

  def call
    validate_payload!
    return failure_result_with_capture if @errors.any?

    fingerprint = payload_fingerprint
    existing_event = IntakeEvent.find_by(event_fingerprint: fingerprint)
    if existing_event
      posting = Posting.find_by(external_posting_id: existing_event.external_posting_id)
      IngestFailure.resolve_for_fingerprint!(fingerprint)
      return Result.new(posting: posting, intake_event: existing_event, duplicate: true, errors: [])
    end

    posting = nil
    intake_event = nil

    ActiveRecord::Base.transaction do
      posting = upsert_posting!
      intake_event = IntakeEvent.create!(
        posting: posting,
        event_fingerprint: fingerprint,
        event_type: payload['eventType'],
        kind: payload['kind'],
        source: 'slack_app',
        external_posting_id: posting.external_posting_id,
        preview_id: payload['previewId'],
        team_id: slack_value('teamId'),
        channel_id: route_value('channelId'),
        published_message_ts: slack_value('publishedMessageTs'),
        user_id: slack_value('publishedByUserId'),
        occurred_at: event_time,
        received_at: received_at,
        payload_version: payload_version,
        payload: JSON.generate(payload)
      )
      IngestFailure.resolve_for_fingerprint!(fingerprint)
    end

    Result.new(posting: posting, intake_event: intake_event, duplicate: false, errors: [])
  rescue ActiveRecord::RecordNotUnique
    existing = IntakeEvent.find_by(event_fingerprint: payload_fingerprint)
    posting = Posting.find_by(external_posting_id: existing&.external_posting_id)
    Result.new(posting: posting, intake_event: existing, duplicate: true, errors: [])
  rescue ActiveRecord::RecordInvalid => e
    capture_failure(e.message)
    Result.new(posting: nil, intake_event: nil, duplicate: false, errors: [e.message])
  rescue StandardError => e
    capture_failure(e.message)
    Result.new(posting: nil, intake_event: nil, duplicate: false, errors: [e.message])
  end

  private

  attr_reader :payload, :received_at

  def validate_payload!
    event_type = payload['eventType']
    kind = payload['kind']

    if event_type.blank?
      @errors << 'eventType is required'
    elsif !EVENT_TYPES.include?(event_type)
      @errors << "eventType must be one of: #{EVENT_TYPES.join(', ')}"
    end

    if kind.blank?
      @errors << 'kind is required'
    elsif !KINDS.include?(kind)
      @errors << "kind must be one of: #{KINDS.join(', ')}"
    end

    @errors << 'values must be an object' unless payload['values'].is_a?(Hash)
    @errors << 'route must be an object' unless payload['route'].is_a?(Hash)
    @errors << 'slack must be an object' unless payload['slack'].is_a?(Hash)

    if route_value('channelId').blank?
      @errors << 'route.channelId is required'
    end

    if route_value('channelFocus').blank?
      @errors << 'route.channelFocus is required'
    end

    if slack_value('teamId').blank?
      @errors << 'slack.teamId is required'
    end

    if slack_value('publishedByUserId').blank?
      @errors << 'slack.publishedByUserId is required'
    end

    if values_value('posterUserId').blank?
      @errors << 'values.posterUserId is required'
    end

    if payload['postingId'].blank? && payload['previewId'].blank?
      @errors << 'postingId or previewId is required'
    end

    @errors << 'payloadVersion must be a positive integer' unless payload_version.positive?
  end

  def failure_result_with_capture
    capture_failure(@errors.join('; '))
    Result.new(posting: nil, intake_event: nil, duplicate: false, errors: @errors)
  end

  def upsert_posting!
    posting = Posting.find_or_initialize_by(external_posting_id: external_posting_id)
    values = payload['values'].is_a?(Hash) ? payload['values'] : {}

    posting.kind = payload['kind']
    posting.status = STATUS_BY_EVENT.fetch(payload['eventType'], posting.status.presence || 'active')
    posting.preview_id = payload['previewId'].presence || posting.preview_id
    posting.team_id = slack_value('teamId').presence || posting.team_id
    posting.poster_user_id = values['posterUserId'].presence || posting.poster_user_id
    posting.published_by_user_id = slack_value('publishedByUserId').presence || posting.published_by_user_id
    posting.channel_id = route_value('channelId').presence || posting.channel_id
    posting.channel_focus = route_value('channelFocus').presence || posting.channel_focus
    posting.channel_label = route_value('channelLabel').presence || posting.channel_label
    posting.preview_dm_channel_id = slack_value('previewDmChannelId').presence || posting.preview_dm_channel_id
    posting.preview_dm_message_ts = slack_value('previewDmMessageTs').presence || posting.preview_dm_message_ts
    posting.published_message_ts = slack_value('publishedMessageTs').presence || posting.published_message_ts
    posting.permalink = payload['permalink'].presence || posting.permalink

    posting.posted_at = parse_time(payload['postedAt']) if payload['eventType'] == 'slack_post_published'
    posting.posted_at ||= parse_time(payload['postedAt'])

    if payload['eventType'] == 'slack_post_archived'
      posting.archived_at = parse_time(payload['archivedAt']) || received_at
      posting.archived_by_user_id = payload['archivedByUserId'].presence || posting.archived_by_user_id
    elsif posting.status == 'active'
      posting.archived_at = nil
      posting.archived_by_user_id = nil
    end

    posting.last_event_at = event_time || received_at

    posting.company_name = values['companyName']
    posting.role_title = values['roleTitle']
    posting.headline = values['headline']
    posting.location_summary = values['locationSummary']
    posting.compensation_value = values['compensationValue']
    posting.visa_policy = values['visaPolicy']
    posting.relationship = values['relationship']
    posting.skills = values['skills']
    posting.summary = values['summary'] || values['notes']
    posting.search_text = Posting.search_text_from_values(values)

    apply_moderation!(posting)

    posting.values_payload = JSON.generate(values)
    posting.last_payload = JSON.generate(payload)
    posting.save!
    posting
  end

  def apply_moderation!(posting)
    moderation = payload['moderation']
    return unless moderation.is_a?(Hash)

    flagged = moderation['flagged'] == true
    posting.moderation_flagged = flagged
    posting.moderation_reason = moderation['reason'].presence

    if moderation['accountAgeDays'].present?
      posting.account_age_days = moderation['accountAgeDays'].to_i
    end

    if flagged && posting.moderation_state.in?(%w[reviewed cleared])
      posting.moderation_state = 'unreviewed'
    end
  end

  def external_posting_id
    payload['postingId'].presence || [payload['previewId'], route_value('channelId'), payload['kind']].compact.join(':')
  end

  def route_value(key)
    route = payload['route']
    return nil unless route.is_a?(Hash)

    route[key]
  end

  def slack_value(key)
    slack = payload['slack']
    return nil unless slack.is_a?(Hash)

    slack[key]
  end

  def values_value(key)
    values = payload['values']
    return nil unless values.is_a?(Hash)

    values[key]
  end

  def event_time
    parse_time(payload['postedAt']) || parse_time(payload['updatedAt']) || parse_time(payload['archivedAt'])
  end

  def parse_time(value)
    return nil if value.blank?

    Time.zone.parse(value)
  rescue ArgumentError
    nil
  end

  def payload_version
    version = payload['payloadVersion']
    return 1 if version.blank?

    Integer(version)
  rescue ArgumentError, TypeError
    -1
  end

  def payload_fingerprint
    normalized = canonicalize(payload)
    Digest::SHA256.hexdigest(JSON.generate(normalized))
  end

  def canonicalize(value)
    case value
    when Hash
      value.keys.sort.each_with_object({}) do |key, result|
        result[key] = canonicalize(value[key])
      end
    when Array
      value.map { |item| canonicalize(item) }
    else
      value
    end
  end

  def capture_failure(reason)
    IngestFailure.record!(
      event_fingerprint: payload_fingerprint,
      event_type: payload['eventType'],
      kind: payload['kind'],
      payload: payload,
      reason: reason,
      occurred_at: received_at
    )
  rescue StandardError
    nil
  end
end
