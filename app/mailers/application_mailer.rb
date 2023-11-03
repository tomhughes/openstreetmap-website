class ApplicationMailer < ActionMailer::Base
  self.delivery_job = MailDeliveryJob
end
