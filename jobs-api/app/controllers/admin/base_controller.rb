module Admin
  class BaseController < ApplicationController
    before_action :require_rls_session!
    before_action :refresh_rls_session!
    before_action :require_rls_admin!
  end
end
