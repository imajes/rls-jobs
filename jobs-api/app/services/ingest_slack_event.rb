require 'digest'
require 'json'

class IngestSlackEvent
  Result = Struct.new(:posting, :intake_event, :duplicate, :errors, keyword_init: true)

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
    return failure_result if @errors.any?

    fingerprint = payload_fingerprint
    existing_event = IntakeEvent.find_by(event_fingerprint: fingerprint)
    if existing_event
      posting = Posting.find_by(external_posting_id: existing_event.external_posting_id)
      return Result.new(posting:, intake_event: existing_event, duplicate: true, errors: [])
    end

    posting = nil
    intake_event = nil

    ActiveRecord::Base.transaction do
      posting = upsert_posting!
      intake_event = IntakeEvent.create!(
        posting:,
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
        received_at:,
        payload: JSON.generate(payload)
      )
    end

    Result.new(posting:, intake_event:, duplicate: false, errors: [])
  rescue ActiveRecord::RecordNotUnique
    existing = IntakeEvent.find_by(event_fingerprint: fingerprint)
    posting = Posting.find_by(external_posting_id: existing&.external_posting_id)
    Result.new(posting:, intake_event: existing, duplicate: true, errors: [])
  rescue ActiveRecord::RecordInvalid => e
    Result.new(posting: nil, intake_event: nil, duplicate: false, errors: [e.message])
  rescue StandardError => e
    Result.new(posting: nil, intake_event: nil, duplicate: false, errors: [e.message])
  end

  private

  attr_reader :payload, :received_at

  def validate_payload!
    @errors << 'eventType is required' if payload['eventType'].blank?
    @errors << 'kind is required' if payload['kind'].blank?
    @errors << 'values must be an object' unless payload['values'].is_a?(Hash)
  end

  def failure_result
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
    posting.search_text = build_search_text(values)

    posting.values_payload = JSON.generate(values)
    posting.last_payload = JSON.generate(payload)
    posting.save!
    posting
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

  def event_time
    parse_time(payload['postedAt']) || parse_time(payload['updatedAt']) || parse_time(payload['archivedAt'])
  end

  def parse_time(value)
    return nil if value.blank?

    Time.zone.parse(value)
  rescue ArgumentError
    nil
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

  def build_search_text(values)
    fragments = [
      values['companyName'],
      values['roleTitle'],
      values['headline'],
      values['locationSummary'],
      values['summary'],
      values['notes'],
      values['skills'],
      Array(values['workArrangements']).join(' '),
      Array(values['employmentTypes']).join(' '),
      Array(values['engagementTypes']).join(' '),
      Array(values['availabilityModes']).join(' '),
      values['compensationValue'],
      values['relationship']
    ]

    fragments.compact.map(&:to_s).reject(&:blank?).join(' ').downcase
  end
end
