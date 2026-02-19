Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      post "intake", to: "intake#create"
      post "auth_links", to: "auth_links#create"
    end
  end

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  get "auth/required", to: "auth#required", as: :auth_required
  get "auth/slack/:token", to: "auth#redeem", as: :auth_slack_redeem
  delete "auth/logout", to: "auth#logout", as: :auth_logout

  resources :postings, only: [:index, :show]
  root "postings#index"
end
