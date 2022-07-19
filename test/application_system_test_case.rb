require "test_helper"

ENV.delete("http_proxy")

ENV["LANG"] = "en.UTF-8"

ActiveSupport.on_load(:action_dispatch_system_test_case) do
  ActionDispatch::SystemTesting::Server.silence_puma = true
end

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, :using => :headless_chrome
end
