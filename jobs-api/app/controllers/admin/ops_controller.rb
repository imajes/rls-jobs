module Admin
  class OpsController < BaseController
    def index
      Ops::Monitor.new.evaluate_all!
      @summary = Ops::SummaryBuilder.new.build
    end
  end
end
