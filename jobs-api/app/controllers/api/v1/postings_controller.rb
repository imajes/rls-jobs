module Api
  module V1
    class PostingsController < BaseController
      before_action :require_ingest_token!

      def index
        scope = Posting.all
        if params[:poster_user_id].present?
          scope = scope.where(poster_user_id: params[:poster_user_id])
        end

        status = normalized_status
        if status != 'all'
          scope = scope.where(status: status)
        end

        limit = normalized_limit
        postings = scope.order(updated_at: :desc).limit(limit)

        render json: {
          ok: true,
          postings: postings.map { |posting| serialize_posting(posting) },
          count: postings.length
        }
      end

      def show
        posting = Posting.find_by!(external_posting_id: params[:external_posting_id])
        render json: {
          ok: true,
          posting: serialize_posting(posting)
        }
      end

      private

      def normalized_status
        allowed = %w[active archived all]
        requested = params[:status].to_s
        allowed.include?(requested) ? requested : 'all'
      end

      def normalized_limit
        requested = params[:limit].presence ? params[:limit].to_i : 50
        [[requested, 1].max, 200].min
      end

      def serialize_posting(posting)
        {
          external_posting_id: posting.external_posting_id,
          kind: posting.kind,
          status: posting.status,
          poster_user_id: posting.poster_user_id,
          team_id: posting.team_id,
          channel_id: posting.channel_id,
          channel_focus: posting.channel_focus,
          channel_label: posting.channel_label,
          published_message_ts: posting.published_message_ts,
          permalink: posting.permalink,
          created_at: posting.created_at,
          updated_at: posting.updated_at,
          archived_at: posting.archived_at,
          values: posting.values_hash,
          moderation: {
            flagged: posting.moderation_flagged,
            state: posting.moderation_state,
            reason: posting.moderation_reason,
            account_age_days: posting.account_age_days,
            last_reviewed_at: posting.moderation_last_reviewed_at,
            reviewed_by: posting.moderation_reviewed_by
          }
        }
      end
    end
  end
end
