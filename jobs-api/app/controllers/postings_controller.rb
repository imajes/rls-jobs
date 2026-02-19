class PostingsController < ApplicationController
  SORT_ORDERS = {
    'recently_updated' => { updated_at: :desc },
    'newest' => { created_at: :desc },
    'oldest' => { created_at: :asc },
    'company_az' => { company_name: :asc, created_at: :desc },
    'compensation' => { compensation_value: :desc, created_at: :desc }
  }.freeze

  def index
    @filters = normalized_filters
    @channel_focuses = Posting.where.not(channel_focus: [nil, '']).distinct.order(:channel_focus).pluck(:channel_focus)

    scope = apply_filters(Posting.all)
    @postings = scope.order(SORT_ORDERS.fetch(@filters[:sort])).limit(@filters[:limit])

    @stats = {
      total: Posting.count,
      active: Posting.active.count,
      archived: Posting.archived.count,
      jobs: Posting.jobs.count,
      candidates: Posting.candidates.count
    }
  end

  def show
    @posting = Posting.find(params[:id])
    @values = @posting.values_hash
    @payload = @posting.last_payload_hash
  end

  private

  def apply_filters(scope)
    filtered = scope

    if @filters[:kind] != 'all'
      filtered = filtered.where(kind: @filters[:kind])
    end

    if @filters[:status] != 'all'
      filtered = filtered.where(status: @filters[:status])
    end

    if @filters[:channel_focus] != 'all'
      filtered = filtered.where(channel_focus: @filters[:channel_focus])
    end

    if @filters[:visa_policy] != 'all'
      filtered = filtered.where(visa_policy: @filters[:visa_policy])
    end

    case @filters[:has_compensation]
    when 'yes'
      filtered = filtered.where.not(compensation_value: [nil, ''])
    when 'no'
      filtered = filtered.where(compensation_value: [nil, ''])
    end

    if @filters[:work_arrangement] != 'all'
      filtered = text_filter(filtered, @filters[:work_arrangement])
    end

    if @filters[:employment_type] != 'all'
      filtered = text_filter(filtered, @filters[:employment_type])
    end

    if @filters[:q].present?
      term = "%#{ActiveRecord::Base.sanitize_sql_like(@filters[:q])}%"
      filtered = filtered.where(
        'search_text LIKE :term OR company_name LIKE :term OR role_title LIKE :term OR headline LIKE :term OR location_summary LIKE :term',
        term: term
      )
    end

    filtered
  end

  def text_filter(scope, token)
    term = "%#{ActiveRecord::Base.sanitize_sql_like(token)}%"
    scope.where('search_text LIKE ?', term)
  end

  def normalized_filters
    raw = params.permit(
      :q,
      :kind,
      :status,
      :channel_focus,
      :visa_policy,
      :has_compensation,
      :work_arrangement,
      :employment_type,
      :sort,
      :limit
    )

    {
      q: raw[:q].to_s.strip,
      kind: fetch_from(raw[:kind], %w[all job_posting candidate_profile], 'all'),
      status: fetch_from(raw[:status], %w[all active archived], 'active'),
      channel_focus: raw[:channel_focus].presence || 'all',
      visa_policy: fetch_from(raw[:visa_policy], %w[all yes no case_by_case unknown], 'all'),
      has_compensation: fetch_from(raw[:has_compensation], %w[all yes no], 'all'),
      work_arrangement: fetch_from(raw[:work_arrangement], %w[all remote hybrid onsite], 'all'),
      employment_type: fetch_from(raw[:employment_type], %w[all full_time part_time contract consulting cofounder], 'all'),
      sort: fetch_from(raw[:sort], SORT_ORDERS.keys, 'recently_updated'),
      limit: begin
        parsed_limit = raw[:limit].presence ? raw[:limit].to_i : 60
        [[parsed_limit, 10].max, 200].min
      end
    }
  end

  def fetch_from(value, allowed, fallback)
    allowed.include?(value) ? value : fallback
  end
end
