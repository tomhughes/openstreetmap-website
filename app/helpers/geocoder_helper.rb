module GeocoderHelper
  def result_to_html(result)
    html_options = { :class => "set_position stretched-link", :data => {} }

    url = if result[:type] && result[:id]
            url_for(:controller => "/#{result[:type].pluralize}", :action => :show, :id => result[:id])
          elsif result[:min_lon] && result[:min_lat] && result[:max_lon] && result[:max_lat]
            "/?bbox=#{result[:min_lon]},#{result[:min_lat]},#{result[:max_lon]},#{result[:max_lat]}"
          else
            "/##{map_hash(result)}"
          end

    result.each do |key, value|
      html_options[:data][key.to_s.tr("_", "-")] = value
    end

    html = []
    html << result[:prefix] if result[:prefix]
    html << " " if result[:prefix] && result[:name]
    html << link_to(result[:name], url, html_options) if result[:name]
    html << " " if result[:suffix] && result[:name]
    html << result[:suffix] if result[:suffix]
    safe_join(html)
  end

  def map_hash(params)
    return nil unless params[:lat].present? && params[:lon].present?

    "map=#{params[:zoom] || 17}/#{params[:lat]}/#{params[:lon]}"
  end

  def describe_location(lat, lon, zoom = nil, language = nil)
    Nominatim.describe_location(lat, lon, zoom, language)
  end
end
