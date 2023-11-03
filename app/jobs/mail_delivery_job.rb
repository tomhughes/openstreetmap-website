class MailDeliveryJob < ActionMailer::MailDeliveryJob
  def perform_now(*)
    super
  rescue ActiveJob::DeserializationError => e
    raise unless e.cause.is_a?(ActiveRecord::RecordNotFound)
  end
end
