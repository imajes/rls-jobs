module Admin
  class PostingsController < BaseController
    def index
      @filters = normalized_filters
      scope = Posting.all
      scope = scope.where(status: @filters[:status]) unless @filters[:status] == "all"
      scope = scope.where(kind: @filters[:kind]) unless @filters[:kind] == "all"
      scope = apply_moderation_filter(scope, @filters[:moderation])
      if @filters[:q].present?
        term = "%#{ActiveRecord::Base.sanitize_sql_like(@filters[:q])}%"
        scope = scope.where(
          "search_text LIKE :term OR external_posting_id LIKE :term OR company_name LIKE :term OR role_title LIKE :term OR headline LIKE :term",
          term: term
        )
      end

      @postings = scope.order(updated_at: :desc).limit(@filters[:limit])
      @stats = {
        total: Posting.count,
        archived: Posting.archived.count,
        events: IntakeEvent.count,
        flagged: Posting.moderation_flagged.count,
        unreviewed: Posting.where(moderation_state: "unreviewed").count,
        escalated: Posting.where(moderation_state: "escalated").count,
        ingest_failures: IngestFailure.unresolved.count
      }
    end

    def edit
      @posting = find_posting
      @values_json = JSON.pretty_generate(@posting.values_hash)
    end

    def update
      @posting = find_posting
      attrs = posting_params.to_h
      values_json = attrs.delete("values_payload_json").to_s

      ActiveRecord::Base.transaction do
        @posting.assign_attributes(attrs)

        if @posting.status == "archived" && @posting.archived_at.blank?
          @posting.archived_at = Time.current
        elsif @posting.status == "active"
          @posting.archived_at = nil
          @posting.archived_by_user_id = nil
        end

        if values_json.present?
          values = JSON.parse(values_json)
          @posting.values_payload = JSON.generate(values)
          @posting.search_text = Posting.search_text_from_values(values)
          @posting.summary = values["summary"] || values["notes"]
        end

        @posting.save!
      end

      redirect_to edit_admin_posting_path(@posting), notice: "Posting updated."
    rescue JSON::ParserError
      flash.now[:alert] = "Values payload must be valid JSON."
      @values_json = values_json.presence || "{}"
      render :edit, status: :unprocessable_entity
    rescue ActiveRecord::RecordInvalid => e
      flash.now[:alert] = "Could not update posting: #{e.message}"
      @values_json = values_json.presence || "{}"
      render :edit, status: :unprocessable_entity
    end

    def archive
      posting = find_posting
      posting.update!(status: "archived", archived_at: Time.current)
      redirect_to admin_postings_path, notice: "Posting archived."
    end

    def restore
      posting = find_posting
      posting.update!(status: "active", archived_at: nil, archived_by_user_id: nil)
      redirect_to admin_postings_path, notice: "Posting restored."
    end

    def resync
      posting = find_posting
      posting.resync_from_values!
      redirect_to edit_admin_posting_path(posting), notice: "Posting fields resynced from values payload."
    end

    def mark_reviewed
      posting = find_posting
      posting.update!(
        moderation_state: "reviewed",
        moderation_last_reviewed_at: Time.current,
        moderation_reviewed_by: rls_slack_user_id
      )
      redirect_to admin_postings_path, notice: "Posting marked reviewed."
    end

    def clear_flag
      posting = find_posting
      posting.update!(
        moderation_flagged: false,
        moderation_state: "cleared",
        moderation_reason: nil,
        moderation_last_reviewed_at: Time.current,
        moderation_reviewed_by: rls_slack_user_id
      )
      redirect_to admin_postings_path, notice: "Moderation flag cleared."
    end

    def escalate
      posting = find_posting
      posting.update!(
        moderation_flagged: true,
        moderation_state: "escalated",
        moderation_last_reviewed_at: Time.current,
        moderation_reviewed_by: rls_slack_user_id
      )
      redirect_to admin_postings_path, notice: "Posting escalated for follow-up."
    end

    def cleanup_archived
      days = params[:days].to_i
      days = 30 if days <= 0
      cutoff = days.days.ago

      scope = Posting.archived.where("COALESCE(archived_at, updated_at) < ?", cutoff)
      deleted_count = scope.count
      scope.find_each(&:destroy)

      redirect_to admin_postings_path, notice: "Deleted #{deleted_count} archived postings older than #{days} days."
    end

    private

    def find_posting
      Posting.find(params[:id])
    end

    def normalized_filters
      raw = params.permit(:status, :kind, :q, :limit, :moderation)
      {
        status: %w[all active archived].include?(raw[:status]) ? raw[:status] : "all",
        kind: %w[all job_posting candidate_profile].include?(raw[:kind]) ? raw[:kind] : "all",
        moderation: fetch_moderation_filter(raw[:moderation]),
        q: raw[:q].to_s.strip,
        limit: begin
          parsed = raw[:limit].presence ? raw[:limit].to_i : 80
          [[parsed, 10].max, 200].min
        end
      }
    end

    def fetch_moderation_filter(value)
      allowed = %w[all flagged unflagged unreviewed reviewed cleared escalated]
      allowed.include?(value) ? value : "all"
    end

    def apply_moderation_filter(scope, moderation)
      case moderation
      when "flagged"
        scope.where(moderation_flagged: true)
      when "unflagged"
        scope.where(moderation_flagged: false)
      when "unreviewed", "reviewed", "cleared", "escalated"
        scope.where(moderation_state: moderation)
      else
        scope
      end
    end

    def posting_params
      params.require(:posting).permit(
        :status,
        :company_name,
        :role_title,
        :headline,
        :location_summary,
        :compensation_value,
        :visa_policy,
        :relationship,
        :skills,
        :summary,
        :channel_focus,
        :channel_label,
        :permalink,
        :moderation_flagged,
        :moderation_state,
        :moderation_reason,
        :account_age_days,
        :values_payload_json
      )
    end
  end
end
