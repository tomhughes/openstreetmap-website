//= require ./directions-endpoint
//= require_self
//= require_tree ./directions
//= require qs/dist/qs

OSM.Directions = function (map) {
  let routeRequest = null; // jqXHR object of an ongoing route request or null
  let chosenEngine;

  const popup = L.popup({ autoPanPadding: [100, 100] });

  const polyline = L.polyline([], {
    color: "#03f",
    opacity: 0.3,
    weight: 10
  });

  const highlight = L.polyline([], {
    color: "#ff0",
    opacity: 0.5,
    weight: 12
  });

  const endpointDragCallback = function (dragging) {
    if (!map.hasLayer(polyline)) return;
    if (dragging && !chosenEngine.draggable) return;
    if (dragging && routeRequest) return;

    getRoute(false, !dragging);
  };
  const endpointChangeCallback = function () {
    getRoute(true, true);
  };

  const endpoints = [
    OSM.DirectionsEndpoint(map, $("input[name='route_from']"), OSM.MARKER_GREEN, endpointDragCallback, endpointChangeCallback),
    OSM.DirectionsEndpoint(map, $("input[name='route_to']"), OSM.MARKER_RED, endpointDragCallback, endpointChangeCallback)
  ];

  const expiry = new Date();
  expiry.setYear(expiry.getFullYear() + 10);

  const engines = OSM.Directions.engines;

  engines.sort(function (a, b) {
    const localised_a = I18n.t("javascripts.directions.engines." + a.id),
          localised_b = I18n.t("javascripts.directions.engines." + b.id);
    return localised_a.localeCompare(localised_b);
  });

  const select = $("select.routing_engines");

  engines.forEach(function (engine, i) {
    select.append("<option value='" + i + "'>" + I18n.t("javascripts.directions.engines." + engine.id) + "</option>");
  });

  $(".directions_form .reverse_directions").on("click", function () {
    const coordFrom = endpoints[0].latlng,
          coordTo = endpoints[1].latlng;
    let routeFrom = "",
        routeTo = "";
    if (coordFrom) {
      routeFrom = coordFrom.lat + "," + coordFrom.lng;
    }
    if (coordTo) {
      routeTo = coordTo.lat + "," + coordTo.lng;
    }

    OSM.router.route("/directions?" + Qs.stringify({
      from: $("#route_to").val(),
      to: $("#route_from").val(),
      route: routeTo + ";" + routeFrom
    }));
  });

  $(".directions_form .btn-close").on("click", function (e) {
    e.preventDefault();
    $(".describe_location").toggle(!endpoints[0].value);
    $(".search_form input[name='query']").val(endpoints[0].value);
    OSM.router.route("/" + OSM.formatHash(map));
  });

  function formatDistance(m) {
    if (m < 1000) {
      return I18n.t("javascripts.directions.distance_m", { distance: Math.round(m) });
    } else if (m < 10000) {
      return I18n.t("javascripts.directions.distance_km", { distance: (m / 1000.0).toFixed(1) });
    } else {
      return I18n.t("javascripts.directions.distance_km", { distance: Math.round(m / 1000) });
    }
  }

  function formatHeight(m) {
    return I18n.t("javascripts.directions.distance_m", { distance: Math.round(m) });
  }

  function formatTime(s) {
    let m = Math.round(s / 60);
    const h = Math.floor(m / 60);
    m -= h * 60;
    return h + ":" + (m < 10 ? "0" : "") + m;
  }

  function findEngine(id) {
    return engines.findIndex(function (engine) {
      return engine.id === id;
    });
  }

  function setEngine(index) {
    chosenEngine = engines[index];
    select.val(index);
  }

  function getRoute(fitRoute, reportErrors) {
    // Cancel any route that is already in progress
    if (routeRequest) routeRequest.abort();

    const o = endpoints[0].latlng,
          d = endpoints[1].latlng;

    if (!o || !d) return;
    $("header").addClass("closed");

    const precision = OSM.zoomPrecision(map.getZoom());

    OSM.router.replace("/directions?" + Qs.stringify({
      engine: chosenEngine.id,
      route: o.lat.toFixed(precision) + "," + o.lng.toFixed(precision) + ";" +
             d.lat.toFixed(precision) + "," + d.lng.toFixed(precision)
    }));

    // copy loading item to sidebar and display it. we copy it, rather than
    // just using it in-place and replacing it in case it has to be used
    // again.
    $("#sidebar_content").html($(".directions_form .loader_copy").html());
    map.setSidebarOverlaid(false);

    routeRequest = chosenEngine.getRoute([o, d], function (err, route) {
      routeRequest = null;

      if (err) {
        map.removeLayer(polyline);

        if (reportErrors) {
          $("#sidebar_content").html("<div class=\"alert alert-danger\">" + I18n.t("javascripts.directions.errors.no_route") + "</div>");
        }

        return;
      }

      polyline
        .setLatLngs(route.line)
        .addTo(map);

      if (fitRoute) {
        map.fitBounds(polyline.getBounds().pad(0.05));
      }

      const distanceText = $("<p>").append(
        I18n.t("javascripts.directions.distance") + ": " + formatDistance(route.distance) + ". " +
        I18n.t("javascripts.directions.time") + ": " + formatTime(route.time) + ".");
      if (typeof route.ascend !== "undefined" && typeof route.descend !== "undefined") {
        distanceText.append(
          $("<br>"),
          I18n.t("javascripts.directions.ascend") + ": " + formatHeight(route.ascend) + ". " +
          I18n.t("javascripts.directions.descend") + ": " + formatHeight(route.descend) + ".");
      }

      const turnByTurnTable = $("<table class='table table-hover table-sm mb-3'>")
        .append($("<tbody>"));
      const directionsCloseButton = $("<button type='button' class='btn-close'>")
        .attr("aria-label", I18n.t("javascripts.close"));

      $("#sidebar_content")
        .empty()
        .append(
          $("<div class='d-flex'>").append(
            $("<h2 class='flex-grow-1 text-break'>")
              .text(I18n.t("javascripts.directions.directions")),
            $("<div>").append(directionsCloseButton)),
          distanceText,
          turnByTurnTable
        );

      // Add each row
      route.steps.forEach(function (step) {
        const ll = step[0],
              direction = step[1],
              instruction = step[2],
              lineseg = step[4];
        let dist = step[3];

        if (dist < 5) {
          dist = "";
        } else if (dist < 200) {
          dist = String(Math.round(dist / 10) * 10) + "m";
        } else if (dist < 1500) {
          dist = String(Math.round(dist / 100) * 100) + "m";
        } else if (dist < 5000) {
          dist = String(Math.round(dist / 100) / 10) + "km";
        } else {
          dist = String(Math.round(dist / 1000)) + "km";
        }

        const row = $("<tr class='turn'/>");
        row.append("<td class='border-0'><div class='direction i" + direction + "'/></td> ");
        row.append("<td>" + instruction);
        row.append("<td class='distance text-body-secondary text-end'>" + dist);

        row.on("click", function () {
          popup
            .setLatLng(ll)
            .setContent("<p>" + instruction + "</p>")
            .openOn(map);
        });

        row.hover(function () {
          highlight
            .setLatLngs(lineseg)
            .addTo(map);
        }, function () {
          map.removeLayer(highlight);
        });

        turnByTurnTable.append(row);
      });

      $("#sidebar_content").append("<p class=\"text-center\">" +
        I18n.t("javascripts.directions.instructions.courtesy", { link: chosenEngine.creditline }) +
        "</p>");

      directionsCloseButton.on("click", function () {
        map.removeLayer(polyline);
        $("#sidebar_content").html("");
        map.setSidebarOverlaid(true);
        // TODO: collapse width of sidebar back to previous
      });
    });
  }

  let chosenEngineIndex = findEngine("fossgis_osrm_car");
  if (Cookies.get("_osm_directions_engine")) {
    chosenEngineIndex = findEngine(Cookies.get("_osm_directions_engine"));
  }
  setEngine(chosenEngineIndex);

  select.on("change", function (e) {
    chosenEngine = engines[e.target.selectedIndex];
    Cookies.set("_osm_directions_engine", chosenEngine.id, { secure: true, expires: expiry, path: "/", samesite: "lax" });
    getRoute(true, true);
  });

  $(".directions_form").on("submit", function (e) {
    e.preventDefault();
    getRoute(true, true);
  });

  $(".routing_marker_column img").on("dragstart", function (e) {
    const dt = e.originalEvent.dataTransfer;
    dt.effectAllowed = "move";
    const dragData = { type: $(this).data("type") };
    dt.setData("text", JSON.stringify(dragData));
    if (dt.setDragImage) {
      const img = $("<img>").attr("src", $(e.originalEvent.target).attr("src"));
      dt.setDragImage(img.get(0), 12, 21);
    }
  });

  const page = {};

  page.pushstate = page.popstate = function () {
    $(".search_form").hide();
    $(".directions_form").show();

    $("#map").on("dragend dragover", function (e) {
      e.preventDefault();
    });

    $("#map").on("drop", function (e) {
      e.preventDefault();
      const oe = e.originalEvent;
      const dragData = JSON.parse(oe.dataTransfer.getData("text"));
      const type = dragData.type;
      const pt = L.DomEvent.getMousePosition(oe, map.getContainer()); // co-ordinates of the mouse pointer at present
      pt.y += 20;
      const ll = map.containerPointToLatLng(pt);
      const precision = OSM.zoomPrecision(map.getZoom());
      const value = ll.lat.toFixed(precision) + ", " + ll.lng.toFixed(precision);
      const llWithPrecision = L.latLng(ll.lat.toFixed(precision), ll.lng.toFixed(precision));
      endpoints[type === "from" ? 0 : 1].setValue(value, llWithPrecision);
    });

    endpoints[0].enable();
    endpoints[1].enable();

    const params = Qs.parse(location.search.substring(1)),
          route = (params.route || "").split(";"),
          from = route[0] && L.latLng(route[0].split(",")),
          to = route[1] && L.latLng(route[1].split(","));

    if (params.engine) {
      const engineIndex = findEngine(params.engine);

      if (engineIndex >= 0) {
        setEngine(engineIndex);
      }
    }

    endpoints[0].setValue(params.from || "", from);
    endpoints[1].setValue(params.to || "", to);

    map.setSidebarOverlaid(!from || !to);
  };

  page.load = function () {
    page.pushstate();
  };

  page.unload = function () {
    $(".search_form").show();
    $(".directions_form").hide();
    $("#map").off("dragend dragover drop");

    endpoints[0].disable();
    endpoints[1].disable();

    map
      .removeLayer(popup)
      .removeLayer(polyline);
  };

  return page;
};

OSM.Directions.engines = [];

OSM.Directions.addEngine = function (engine, supportsHTTPS) {
  if (document.location.protocol === "http:" || supportsHTTPS) {
    OSM.Directions.engines.push(engine);
  }
};
