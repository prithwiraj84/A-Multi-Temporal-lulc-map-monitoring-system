(function () {
  "use strict";

  // Configuration
  if (!window.EE_APP_CONFIG) {
    console.error("EE_APP_CONFIG is missing. Create ee-config.js.");
    throw new Error("EE_APP_CONFIG is missing. Create ee-config.js from ee-config.example.js.");
  }

  var cfg = window.EE_APP_CONFIG;
  console.log("[INIT] Config loaded:", cfg.clientId.substring(0, 20));

  // State management
  var state = {
    authenticated: false,
    initialized: false,
    model: null,
    lulcCollection: null,
    futureLulcCollection: null,
    futureValidation: null,
    currentLulc: null,
    currentImage: null,
    currentLulcLayer: null,
    currentChangeLayer: null,
    currentPredictionLayer: null,
    modisAnomalyImage: null,
    modisAnomalyLayer: null,
    droughtLayer: null,
    lstLayer: null,
    fireLayer: null,
    trendChart: null,
    advancedChart: null,
    modisChart: null,
    trainingData: null,
    testData: null,
    aoi: null,
    basemaps: {},
    activeBasemap: "streets",
    managedLayers: {},
    classNames: cfg.classes.map(function (c) {
      return c.name;
    }),
    palette: cfg.classes.map(function (c) {
      return c.color.replace("#", "");
    })
  };

  // Initialize map
  var map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView(
    [
      cfg.mapStart && cfg.mapStart.lat ? cfg.mapStart.lat : 0,
      cfg.mapStart && cfg.mapStart.lng ? cfg.mapStart.lng : 0
    ],
    cfg.mapStart && cfg.mapStart.zoom ? cfg.mapStart.zoom : 2
  );

  var streetsLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22,
    attribution: "&copy; OpenStreetMap contributors"
  });

  var satelliteLayer = L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 22,
      attribution: "Tiles &copy; Esri"
    }
  );

  var terrainLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap"
  });

  state.basemaps = {
    streets: streetsLayer,
    satellite: satelliteLayer,
    terrain: terrainLayer
  };

  streetsLayer.addTo(map);

  L.control
    .layers(
      {
        Streets: streetsLayer,
        Satellite: satelliteLayer,
        Terrain: terrainLayer
      },
      {},
      { collapsed: true, position: "topright" }
    )
    .addTo(map);

  L.control.scale({ position: "bottomleft" }).addTo(map);

  // DOM elements
  var el = {
    authBtn: document.getElementById("authBtn"),
    initBtn: document.getElementById("initBtn"),
    authStatus: document.getElementById("authStatus"),
    classifierSelect: document.getElementById("classifierSelect"),
    trainBtn: document.getElementById("trainBtn"),
    modelStatus: document.getElementById("modelStatus"),
    accuracyBox: document.getElementById("accuracyBox"),
    yearSelect: document.getElementById("yearSelect"),
    showYearBtn: document.getElementById("showYearBtn"),
    statsBox: document.getElementById("statsBox"),
    fromYearSelect: document.getElementById("fromYearSelect"),
    toYearSelect: document.getElementById("toYearSelect"),
    changeBtn: document.getElementById("changeBtn"),
    changeBox: document.getElementById("changeBox"),
    trendBtn: document.getElementById("trendBtn"),
    trendChartCanvas: document.getElementById("trendChart"),
    basemapSelect: document.getElementById("basemapSelect"),
    clearLayersBtn: document.getElementById("clearLayersBtn"),
    layerToggleList: document.getElementById("layerToggleList"),
    advancedChartType: document.getElementById("advancedChartType"),
    advancedYearFrom: document.getElementById("advancedYearFrom"),
    advancedYearTo: document.getElementById("advancedYearTo"),
    advancedYearSingle: document.getElementById("advancedYearSingle"),
    advancedRangeRow: document.getElementById("advancedRangeRow"),
    advancedSingleRow: document.getElementById("advancedSingleRow"),
    advancedChartBtn: document.getElementById("advancedChartBtn"),
    advancedChartCanvas: document.getElementById("advancedChartCanvas"),
    advancedChartSummary: document.getElementById("advancedChartSummary"),
    predictionStatus: document.getElementById("predictionStatus"),
    predictionYearSelect: document.getElementById("predictionYearSelect"),
    generatePredictionBtn: document.getElementById("generatePredictionBtn"),
    showPredictionBtn: document.getElementById("showPredictionBtn"),
    predictionStatsBox: document.getElementById("predictionStatsBox"),
    exportClassSelect: document.getElementById("exportClassSelect"),
    exportVectorBtn: document.getElementById("exportVectorBtn"),
    exportImageBtn: document.getElementById("exportImageBtn"),
    exportVideoBtn: document.getElementById("exportVideoBtn"),
    exportStatusBox: document.getElementById("exportStatusBox"),
    modisTrendBtn: document.getElementById("modisTrendBtn"),
    ndviAnomalyBtn: document.getElementById("ndviAnomalyBtn"),
    droughtBtn: document.getElementById("droughtBtn"),
    seasonalBtn: document.getElementById("seasonalBtn"),
    lstBtn: document.getElementById("lstBtn"),
    fireBtn: document.getElementById("fireBtn"),
    exportModisBtn: document.getElementById("exportModisBtn"),
    modisChartCanvas: document.getElementById("modisChartCanvas"),
    modisStatusBox: document.getElementById("modisStatusBox"),
    inspectorBox: document.getElementById("inspectorBox"),
    legend: document.getElementById("legend")
  };

  // Initialize UI
  console.log("[INIT] Initializing UI components");
  populateYearSelectors();
  renderLegend();
  initializeLayerManagerUi();
  updateAdvancedChartVisibility();
  attachEvents();

  function attachEvents() {
    el.authBtn.addEventListener("click", authenticate);
    el.initBtn.addEventListener("click", initializeEarthEngine);
    el.trainBtn.addEventListener("click", trainModel);
    el.showYearBtn.addEventListener("click", function () {
      updateMap(parseInt(el.yearSelect.value, 10));
    });
    el.yearSelect.addEventListener("change", function () {
      if (state.lulcCollection) {
        updateMap(parseInt(el.yearSelect.value, 10));
      }
    });
    el.changeBtn.addEventListener("click", runChangeDetection);
    el.trendBtn.addEventListener("click", generateTrendChart);

    if (el.basemapSelect) {
      el.basemapSelect.addEventListener("change", function () {
        setBasemap(el.basemapSelect.value);
      });
    }

    if (el.clearLayersBtn) {
      el.clearLayersBtn.addEventListener("click", clearDynamicLayers);
    }

    if (el.advancedChartType) {
      el.advancedChartType.addEventListener("change", updateAdvancedChartVisibility);
    }

    if (el.advancedChartBtn) {
      el.advancedChartBtn.addEventListener("click", generateSelectedChart);
    }

    if (el.generatePredictionBtn) {
      el.generatePredictionBtn.addEventListener("click", generateFuturePredictions);
    }

    if (el.showPredictionBtn) {
      el.showPredictionBtn.addEventListener("click", showFuturePrediction);
    }

    if (el.exportVectorBtn) {
      el.exportVectorBtn.addEventListener("click", exportVector);
    }

    if (el.exportImageBtn) {
      el.exportImageBtn.addEventListener("click", exportImage);
    }

    if (el.exportVideoBtn) {
      el.exportVideoBtn.addEventListener("click", exportVideo);
    }

    if (el.modisTrendBtn) {
      el.modisTrendBtn.addEventListener("click", generateMODISTrend);
    }

    if (el.ndviAnomalyBtn) {
      el.ndviAnomalyBtn.addEventListener("click", generateNDVIAnomaly);
    }

    if (el.droughtBtn) {
      el.droughtBtn.addEventListener("click", showDroughtAreas);
    }

    if (el.seasonalBtn) {
      el.seasonalBtn.addEventListener("click", seasonalNDVI);
    }

    if (el.lstBtn) {
      el.lstBtn.addEventListener("click", showLST);
    }

    if (el.fireBtn) {
      el.fireBtn.addEventListener("click", showFires);
    }

    if (el.exportModisBtn) {
      el.exportModisBtn.addEventListener("click", exportNDVIAnomaly);
    }

    map.on("click", function (evt) {
      inspectLocation(evt.latlng.lat, evt.latlng.lng);
    });
    
    console.log("[INIT] Event listeners attached");
  }

  function setStatus(node, message, isError) {
    node.textContent = message;
    node.style.color = isError ? "#b23d2a" : "#1c2a1f";
  }

  function setBox(node, lines) {
    node.classList.remove("muted");
    node.textContent = lines.join("\n");
  }

  function populateYearSelectors() {
    [
      el.yearSelect,
      el.fromYearSelect,
      el.toYearSelect,
      el.advancedYearFrom,
      el.advancedYearTo,
      el.advancedYearSingle
    ]
      .filter(Boolean)
      .forEach(function (sel) {
      sel.innerHTML = "";
      cfg.yearList.forEach(function (year) {
        var opt = document.createElement("option");
        opt.value = String(year);
        opt.textContent = String(year);
        sel.appendChild(opt);
      });
    });

    if (el.toYearSelect) {
      el.toYearSelect.value = String(cfg.yearList[cfg.yearList.length - 1]);
    }

    if (el.advancedYearTo) {
      el.advancedYearTo.value = String(cfg.yearList[cfg.yearList.length - 1]);
    }

    if (el.predictionYearSelect) {
      el.predictionYearSelect.value = "2030";
    }

    if (el.exportClassSelect) {
      el.exportClassSelect.innerHTML = "";
      cfg.classes.forEach(function (klass) {
        var option = document.createElement("option");
        option.value = String(klass.id);
        option.textContent = klass.name;
        el.exportClassSelect.appendChild(option);
      });
    }
  }

  function renderLegend() {
    el.legend.innerHTML = "";
    cfg.classes.forEach(function (klass) {
      var row = document.createElement("div");
      row.className = "legend-item";
      var swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.backgroundColor = klass.color;
      var text = document.createElement("span");
      text.textContent = klass.name + " (" + klass.id + ")";
      row.appendChild(swatch);
      row.appendChild(text);
      el.legend.appendChild(row);
    });
  }

  function initializeLayerManagerUi() {
    if (el.basemapSelect && !el.basemapSelect.value) {
      el.basemapSelect.value = state.activeBasemap;
    }
    renderManagedLayerList();
  }

  function setBasemap(name) {
    if (!state.basemaps[name] || state.activeBasemap === name) {
      return;
    }

    var previous = state.basemaps[state.activeBasemap];
    if (previous && map.hasLayer(previous)) {
      map.removeLayer(previous);
    }

    state.basemaps[name].addTo(map);
    state.activeBasemap = name;
  }

  function registerManagedLayer(key, name, layer, options) {
    options = options || {};

    if (state.managedLayers[key] && state.managedLayers[key].layer) {
      removeLayerIfPresent(state.managedLayers[key].layer);
    }

    state.managedLayers[key] = {
      key: key,
      name: name,
      layer: layer,
      visible: options.visible !== false,
      locked: options.locked === true
    };

    if (options.visible !== false) {
      layer.addTo(map);
    }

    renderManagedLayerList();
  }

  function renderManagedLayerList() {
    if (!el.layerToggleList) {
      return;
    }

    el.layerToggleList.classList.remove("muted");
    el.layerToggleList.innerHTML = "";

    var keys = Object.keys(state.managedLayers);
    if (!keys.length) {
      el.layerToggleList.classList.add("muted");
      el.layerToggleList.textContent = "No analysis layers added yet.";
      return;
    }

    keys.forEach(function (key) {
      var item = state.managedLayers[key];
      var row = document.createElement("label");
      row.className = "layer-toggle-row";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!item.visible;
      checkbox.addEventListener("change", function () {
        item.visible = checkbox.checked;
        if (item.visible) {
          item.layer.addTo(map);
        } else {
          removeLayerIfPresent(item.layer);
        }
      });

      var nameSpan = document.createElement("span");
      nameSpan.textContent = item.name;

      row.appendChild(checkbox);
      row.appendChild(nameSpan);
      el.layerToggleList.appendChild(row);
    });
  }

  function clearDynamicLayers() {
    Object.keys(state.managedLayers).forEach(function (key) {
      var item = state.managedLayers[key];
      if (item.locked) {
        return;
      }

      removeLayerIfPresent(item.layer);
      delete state.managedLayers[key];
    });

    state.currentChangeLayer = null;
    state.currentPredictionLayer = null;
    state.modisAnomalyLayer = null;
    state.droughtLayer = null;
    state.lstLayer = null;
    state.fireLayer = null;

    if (state.currentLulcLayer) {
      registerManagedLayer(
        "lulc-current",
        "LULC " + (el.yearSelect ? el.yearSelect.value : "Current"),
        state.currentLulcLayer,
        { visible: true }
      );
    }

    renderManagedLayerList();
  }

  function addManagedEeLayer(key, title, image, visParams, options) {
    options = options || {};
    var layer = createEeTileLayer(image, visParams, options.opacity);
    registerManagedLayer(key, title, layer, {
      visible: options.visible !== false,
      locked: options.locked === true
    });
    return layer;
  }

  function updateAdvancedChartVisibility() {
    if (!el.advancedChartType) {
      return;
    }

    var value = el.advancedChartType.value;
    var needsRange = value === "Change Matrix" || value === "Net Change Bar Chart";
    var needsSingle = value === "Classification Confidence" || value === "NDVI by LULC Class";

    if (el.advancedRangeRow) {
      el.advancedRangeRow.style.display = needsRange ? "grid" : "none";
    }

    if (el.advancedSingleRow) {
      el.advancedSingleRow.style.display = needsSingle ? "block" : "none";
    }
  }

  // Authentication
  function authenticate() {
    console.log("[AUTH] Authenticate button clicked");
    console.log("[AUTH] EE library available:", typeof ee !== "undefined");

    if (!cfg.clientId || cfg.clientId.indexOf("YOUR_") === 0) {
      console.error("[AUTH] ClientId not configured");
      setStatus(el.authStatus, "Status: Configure clientId in ee-config.js first.", true);
      return;
    }

    if (typeof ee === "undefined") {
      console.error("[AUTH] Earth Engine library not loaded");
      setStatus(el.authStatus, "Status: Earth Engine library not loaded. Refresh page.", true);
      return;
    }

    if (!ee.data) {
      console.error("[AUTH] ee.data not available");
      setStatus(el.authStatus, "Status: Earth Engine API not ready. Refresh page.", true);
      return;
    }

    setStatus(el.authStatus, "Status: Opening authentication popup...", false);

    var onAuthSuccess = function () {
      console.log("[AUTH-SUCCESS] User authenticated");
      state.authenticated = true;
      el.initBtn.disabled = false;
      setStatus(el.authStatus, "Status: Authentication successful.", false);
    };

    var onAuthError = function (err) {
      console.error("[AUTH-ERROR] Authentication failed:", err);
      var detail = err && err.message ? err.message : String(err || "Unknown error");
      setStatus(el.authStatus, "Status: Authentication failed. " + detail, true);
    };

    var authScopes =
      Array.isArray(cfg.authScopes) && cfg.authScopes.length
        ? cfg.authScopes
        : ["https://www.googleapis.com/auth/earthengine"];

    try {
      if (typeof ee.data.authenticateViaOauth === "function") {
        console.log("[AUTH] Using ee.data.authenticateViaOauth with clientId");
        ee.data.authenticateViaOauth(
          cfg.clientId,
          onAuthSuccess,
          onAuthError,
          authScopes,
          function () {
            if (typeof ee.data.authenticateViaPopup === "function") {
              console.log("[AUTH] Silent auth unavailable, falling back to popup");
              ee.data.authenticateViaPopup(onAuthSuccess, onAuthError);
            } else {
              console.error("[AUTH] Popup fallback unavailable. Methods:", Object.keys(ee.data || {}));
              setStatus(el.authStatus, "Status: Auth popup method not available.", true);
            }
          },
          true
        );
      } else if (typeof ee.data.authenticateViaPopup === "function") {
        console.log("[AUTH] Popup available but OAuth initializer missing; attempting popup directly");
        ee.data.authenticateViaPopup(onAuthSuccess, onAuthError);
      } else {
        console.error("[AUTH] No supported EE auth method found. Methods:", Object.keys(ee.data || {}));
        setStatus(el.authStatus, "Status: No supported Earth Engine auth method found.", true);
      }
    } catch (e) {
      console.error("[AUTH-EXCEPTION] Error in authenticate:", e);
      setStatus(el.authStatus, "Status: Error - " + e.message, true);
    }
  }
  function getEeProjectCandidates() {
    var projects = [];
    var pushProject = function (projectId) {
      if (typeof projectId !== "string") {
        return;
      }

      var trimmed = projectId.trim();
      if (trimmed && projects.indexOf(trimmed) === -1) {
        projects.push(trimmed);
      }
    };

    pushProject(cfg.eeProjectId);

    if (Array.isArray(cfg.eeProjectCandidates)) {
      cfg.eeProjectCandidates.forEach(pushProject);
    }

    if (cfg.assets && typeof cfg.assets.aoi === "string") {
      var match = cfg.assets.aoi.match(/^projects\/([^/]+)\//);
      if (match && match[1]) {
        pushProject(match[1]);
      }
    }

    pushProject(cfg.fallbackEeProjectId);

    return projects;
  }

  function initializeEarthEngine() {
    setStatus(el.authStatus, "Status: Initializing Earth Engine...", false);

    var projectCandidates = getEeProjectCandidates();
    if (!projectCandidates.length) {
      setStatus(
        el.authStatus,
        "Status: Initialization failed. Set eeProjectId in ee-config.js to your Earth Engine-enabled Cloud project ID.",
        true
      );
      return;
    }

    var isServiceUsagePermissionError = function (detail) {
      return (
        typeof detail === "string" &&
        (detail.indexOf("roles/serviceusage.serviceUsageConsumer") !== -1 ||
          detail.indexOf("serviceusage.services.use") !== -1 ||
          detail.indexOf("Caller does not have required permission to use project") !== -1)
      );
    };

    var extractDeniedProject = function (detail) {
      if (typeof detail !== "string") {
        return cfg.eeProjectId || "the configured project";
      }

      var match = detail.match(/use project ([^ .]+)\./);
      if (match && match[1]) {
        return match[1];
      }

      return cfg.eeProjectId || "the configured project";
    };

    var extractUnregisteredProject = function (detail) {
      if (typeof detail !== "string") {
        return null;
      }

      var match = detail.match(/Project ([^ ]+) is not registered to use Earth Engine\./);
      if (match && match[1]) {
        return match[1];
      }

      return null;
    };

    var lastDetail = "Initialization error";
    var serviceUsageDeniedDetail = null;
    var unregisteredProject = null;

    for (var i = 0; i < projectCandidates.length; i++) {
      var eeProjectId = projectCandidates[i];
      console.log("[INIT] Using EE project:", eeProjectId);

      try {
        // Synchronous initialize avoids async callback queueing across retries.
        ee.initialize(null, null, null, null, null, eeProjectId);

        state.initialized = true;
        state.aoi = getAoi();
        setStatus(el.authStatus, "Status: Earth Engine initialized (project: " + eeProjectId + ").", false);
        enablePostInitControls();
        el.trainBtn.disabled = false;
        setMapCenterFromAoi();
        return;
      } catch (err) {
        lastDetail = err && err.message ? err.message : String(err || "Initialization error");
        console.warn("[INIT] Initialization failed for project " + eeProjectId + ": " + lastDetail);

        if (!serviceUsageDeniedDetail && isServiceUsagePermissionError(lastDetail)) {
          serviceUsageDeniedDetail = lastDetail;
        }

        if (!unregisteredProject) {
          unregisteredProject = extractUnregisteredProject(lastDetail);
        }

        if (i < projectCandidates.length - 1) {
          setStatus(el.authStatus, "Status: Project " + eeProjectId + " failed, trying next project...", false);
        }
      }
    }

    if (unregisteredProject) {
      setStatus(
        el.authStatus,
        "Status: Initialization failed. OAuth client project " +
          unregisteredProject +
          " is not Earth Engine-registered. Create a new OAuth Web client in project " +
          (cfg.eeProjectId || "your EE project") +
          " and update clientId in ee-config.js, or register " +
          unregisteredProject +
          " for Earth Engine.",
        true
      );
      return;
    }

    if (serviceUsageDeniedDetail) {
      var deniedProject = extractDeniedProject(serviceUsageDeniedDetail);
      setStatus(
        el.authStatus,
        "Status: Initialization failed. Account needs role roles/serviceusage.serviceUsageConsumer on project " +
          deniedProject +
          ". Confirm the role is granted at the project level (not only billing/org), then retry after propagation.",
        true
      );
      return;
    }

    setStatus(el.authStatus, "Status: Initialization failed. " + lastDetail, true);
  }

  function getAoi() {
    if (!cfg.assets || !cfg.assets.aoi) {
      throw new Error("assets.aoi is required in ee-config.js");
    }
    if (typeof cfg.assets.aoi === "string") {
      return ee.FeatureCollection(cfg.assets.aoi).geometry();
    }
    return cfg.assets.aoi;
  }

  function setMapCenterFromAoi() {
    var centroid = state.aoi.centroid(1);
    centroid.coordinates().evaluate(function (coords) {
      if (coords && coords.length >= 2) {
        map.setView([coords[1], coords[0]], cfg.mapStart && cfg.mapStart.zoom ? cfg.mapStart.zoom : 11);
      }
    });

    try {
      addManagedEeLayer(
        "aoi-boundary",
        "AOI Boundary",
        ee.FeatureCollection([ee.Feature(state.aoi)]).style({
          color: "ffeb3b",
          fillColor: "00000000",
          width: 2
        }),
        { min: 0, max: 1 },
        { visible: true, locked: true, opacity: 1 }
      );
    } catch (err) {
      console.warn("[AOI] Unable to render AOI boundary layer:", err);
    }
  }

  function getTrainingCollection() {
    var classIds = Object.keys(cfg.trainingAssetsByClass || {});
    if (!classIds.length) {
      throw new Error("trainingAssetsByClass is empty in ee-config.js");
    }
    var merged = null;
    classIds.forEach(function (key) {
      var id = parseInt(key, 10);
      var assetId = cfg.trainingAssetsByClass[key];
      var col = ee.FeatureCollection(assetId).map(function (f) {
        return ee.Feature(f).set("class", id);
      });
      merged = merged ? merged.merge(col) : col;
    });
    return merged;
  }

  var MODEL_BANDS = ["Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2", "NDVI", "EVI", "NDBI", "MNDWI", "BSI", "UI"];
  var MODIS_NDVI = ee.ImageCollection("MODIS/061/MOD13Q1");
  var MODIS_LST = ee.ImageCollection("MODIS/061/MOD11A2");
  var MODIS_FIRE = ee.ImageCollection("MODIS/061/MOD14A1");

  function maskLandsatSr(image) {
    var qaMask = image.select("QA_PIXEL").bitwiseAnd(parseInt("11111", 2)).eq(0);
    var saturationMask = image.select("QA_RADSAT").eq(0);
    return image.updateMask(qaMask).updateMask(saturationMask);
  }

  function maskS2Clouds(image) {
    var qa = image.select("QA60");
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    return image.updateMask(mask);
  }

  function processLandsat5(col) {
    return col
      .select(["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"], ["Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2"])
      .map(function (img) {
        return img.multiply(0.0000275).add(-0.2).clamp(0, 1).copyProperties(img, ["system:time_start"]);
      });
  }

  function processLandsat7(col) {
    return col
      .select(["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"], ["Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2"])
      .map(function (img) {
        return img.multiply(0.0000275).add(-0.2).clamp(0, 1).copyProperties(img, ["system:time_start"]);
      });
  }

  function processLandsat8(col) {
    return col
      .select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"], ["Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2"])
      .map(function (img) {
        return img.multiply(0.0000275).add(-0.2).clamp(0, 1).copyProperties(img, ["system:time_start"]);
      });
  }

  function processSentinel2(col) {
    return col
      .select(["B2", "B3", "B4", "B8", "B11", "B12"], ["Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2"])
      .map(function (img) {
        return img.divide(10000).clamp(0, 1).copyProperties(img, ["system:time_start"]);
      });
  }

  function addIndices(image) {
    var ndvi = image
      .expression("(NIR - RED) / (NIR + RED + 1e-6)", {
        NIR: image.select("NIR"),
        RED: image.select("Red")
      })
      .rename("NDVI");
    var evi = image
      .expression("2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))", {
        NIR: image.select("NIR"),
        RED: image.select("Red"),
        BLUE: image.select("Blue")
      })
      .rename("EVI");
    var ndbi = image
      .expression("(SWIR1 - NIR) / (SWIR1 + NIR + 1e-6)", {
        SWIR1: image.select("SWIR1"),
        NIR: image.select("NIR")
      })
      .rename("NDBI");
    var mndwi = image
      .expression("(GREEN - SWIR1) / (GREEN + SWIR1 + 1e-6)", {
        GREEN: image.select("Green"),
        SWIR1: image.select("SWIR1")
      })
      .rename("MNDWI");
    var bsi = image
      .expression("((SWIR2 + RED) - (NIR + BLUE)) / ((SWIR2 + RED) + (NIR + BLUE) + 1e-6)", {
        RED: image.select("Red"),
        BLUE: image.select("Blue"),
        NIR: image.select("NIR"),
        SWIR2: image.select("SWIR2")
      })
      .rename("BSI");
    var ui = image
      .expression("(SWIR1 - NIR) / (SWIR1 + NIR + 1e-6)", {
        SWIR1: image.select("SWIR1"),
        NIR: image.select("NIR")
      })
      .rename("UI");

    return image.addBands([ndvi, evi, ndbi, mndwi, bsi, ui]);
  }

  function getImageryForYear(year) {
    var startDate = ee.Date.fromYMD(year, 10, 1);
    var endDate = ee.Date.fromYMD(year + 1, 3, 31);
    var imagery;

    if (year >= 2017) {
      var s2 = ee
        .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate(startDate, endDate)
        .filterBounds(state.aoi)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
        .map(maskS2Clouds);

      var l8 = ee
        .ImageCollection("LANDSAT/LC08/C02/T1_L2")
        .filterDate(startDate, endDate)
        .filterBounds(state.aoi)
        .filter(ee.Filter.lt("CLOUD_COVER", 30))
        .map(maskLandsatSr);

      imagery = processSentinel2(s2).merge(processLandsat8(l8));
    } else if (year >= 2013) {
      var l8Only = ee
        .ImageCollection("LANDSAT/LC08/C02/T1_L2")
        .filterDate(startDate, endDate)
        .filterBounds(state.aoi)
        .filter(ee.Filter.lt("CLOUD_COVER", 30))
        .map(maskLandsatSr);

      imagery = processLandsat8(l8Only);
    } else if (year >= 1999) {
      var l5 = ee
        .ImageCollection("LANDSAT/LT05/C02/T1_L2")
        .filterDate(startDate, endDate)
        .filterBounds(state.aoi)
        .filter(ee.Filter.lt("CLOUD_COVER", 30))
        .map(maskLandsatSr);

      var l7 = ee
        .ImageCollection("LANDSAT/LE07/C02/T1_L2")
        .filterDate(startDate, endDate)
        .filterBounds(state.aoi)
        .filter(ee.Filter.lt("CLOUD_COVER", 30))
        .map(maskLandsatSr);

      imagery = processLandsat5(l5).merge(processLandsat7(l7));
    } else {
      var earlyL5 = ee
        .ImageCollection("LANDSAT/LT05/C02/T1_L2")
        .filterDate(startDate, endDate)
        .filterBounds(state.aoi)
        .filter(ee.Filter.lt("CLOUD_COVER", 30))
        .map(maskLandsatSr);

      imagery = processLandsat5(earlyL5);
    }

    var fallback = ee.Image.constant([0, 0, 0, 0, 0, 0]).rename(["Blue", "Green", "Red", "NIR", "SWIR1", "SWIR2"]);

    var composite = ee.Image(
      ee.Algorithms.If(imagery.size().gt(0), imagery.median().clip(state.aoi), fallback.clip(state.aoi))
    );

    return addIndices(composite).set("year", year, "system:time_start", ee.Date.fromYMD(year, 1, 1));
  }

  function getClassifier(classifierType) {
    if (classifierType === "SVM") {
      return ee.Classifier.libsvm({
        kernelType: "RBF",
        gamma: 0.5,
        cost: 10,
        decisionProcedure: "Voting"
      });
    }

    if (classifierType === "CART") {
      return ee.Classifier.smileCart();
    }

    if (classifierType === "Gradient Tree Boost") {
      if (ee.Classifier && typeof ee.Classifier.smileGradientTreeBoost === "function") {
        return ee.Classifier.smileGradientTreeBoost(100);
      }

      console.warn("[TRAIN] smileGradientTreeBoost is not available in this EE runtime. Falling back to Random Forest.");
    }

    return ee.Classifier.smileRandomForest({
      numberOfTrees: 100,
      seed: 42
    });
  }

  function createEeTileLayer(image, visParams, opacity) {
    var mapId = ee.Image(image).getMap(visParams || {});
    var urlFormat = mapId.urlFormat || mapId.url_format;

    if (urlFormat) {
      return L.tileLayer(urlFormat, {
        attribution: "&copy; Google Earth Engine",
        maxZoom: 22,
        opacity: opacity == null ? 1 : opacity
      });
    }

    var layer = L.tileLayer("", {
      attribution: "&copy; Google Earth Engine",
      maxZoom: 22,
      opacity: opacity == null ? 1 : opacity
    });

    layer.getTileUrl = function (coords) {
      return ee.data.getTileUrl(mapId, coords.x, coords.y, coords.z);
    };

    return layer;
  }

  function removeLayerIfPresent(layer) {
    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  }

  function resultGroupsToAreaMap(result) {
    var areaByClass = {};
    if (!result || !Array.isArray(result.groups)) {
      return areaByClass;
    }

    result.groups.forEach(function (group) {
      var classId = parseInt(group.class, 10);
      if (!isNaN(classId)) {
        areaByClass[classId] = Number(group.sum || 0);
      }
    });

    return areaByClass;
  }

  function buildAreaLines(title, areaByClass) {
    var lines = [title];
    var total = 0;

    cfg.classes.forEach(function (klass) {
      var area = Number(areaByClass[klass.id] || 0);
      total += area;
      lines.push(klass.name + ": " + area.toFixed(2) + " ha");
    });

    lines.push("Total Area: " + total.toFixed(2) + " ha");
    return lines;
  }

  function reduceAreaByClass(image, onSuccess, onError) {
    var areaImage = ee.Image.pixelArea().divide(10000).addBands(ee.Image(image).rename("LULC"));

    var runReduce = function (scaleValue, maxPixelsValue) {
      var stats = areaImage.reduceRegion({
        reducer: ee.Reducer.sum().group({
          groupField: 1,
          groupName: "class"
        }),
        geometry: state.aoi,
        scale: scaleValue,
        maxPixels: maxPixelsValue,
        tileScale: 4,
        bestEffort: true
      });

      stats.evaluate(function (result, err) {
        if (err) {
          if (scaleValue < 120) {
            runReduce(scaleValue * 2, 1e12);
            return;
          }

          if (onError) {
            onError(err);
          }
          return;
        }

        if (onSuccess) {
          onSuccess(result || { groups: [] });
        }
      });
    };

    runReduce(cfg.scale || 30, 1e9);
  }

  function enableAnalysisControls() {
    el.yearSelect.disabled = false;
    el.showYearBtn.disabled = false;
    el.fromYearSelect.disabled = false;
    el.toYearSelect.disabled = false;
    el.changeBtn.disabled = false;
    el.trendBtn.disabled = false;

    if (el.advancedChartBtn) {
      el.advancedChartBtn.disabled = false;
    }

    if (el.generatePredictionBtn) {
      el.generatePredictionBtn.disabled = false;
    }

    if (el.showPredictionBtn) {
      el.showPredictionBtn.disabled = false;
    }

    if (el.exportVectorBtn) {
      el.exportVectorBtn.disabled = false;
    }

    if (el.exportImageBtn) {
      el.exportImageBtn.disabled = false;
    }

    if (el.exportVideoBtn) {
      el.exportVideoBtn.disabled = false;
    }
  }

  function enablePostInitControls() {
    [
      el.modisTrendBtn,
      el.ndviAnomalyBtn,
      el.droughtBtn,
      el.seasonalBtn,
      el.lstBtn,
      el.fireBtn,
      el.exportModisBtn
    ]
      .filter(Boolean)
      .forEach(function (btn) {
        btn.disabled = false;
      });
  }

  function calculateAccuracy(referenceImage, referenceYear) {
    setBox(el.accuracyBox, ["Calculating model accuracy..."]);

    var predictors = referenceImage.select(MODEL_BANDS).unmask(0);
    var testSample = predictors.sampleRegions({
      collection: state.testData,
      scale: cfg.scale || 30,
      properties: ["class"],
      tileScale: 4
    });

    var testClassified = testSample.classify(state.model);
    var orderedClasses = ee.List(
      cfg.classes.map(function (klass) {
        return klass.id;
      })
    );
    var confusionMatrix = testClassified.errorMatrix("class", "classification", orderedClasses);

    var metrics = ee.Dictionary({
      totalSamples: state.trainingData.size().add(state.testData.size()),
      trainingSamples: state.trainingData.size(),
      testSamples: state.testData.size(),
      overallAccuracy: confusionMatrix.accuracy(),
      kappa: confusionMatrix.kappa(),
      matrixArray: confusionMatrix.array()
    });

    metrics.evaluate(function (result, err) {
      if (err) {
        setBox(el.accuracyBox, ["Accuracy evaluation failed: " + (err.message || String(err))]);
        return;
      }

      var overallAccuracy = Number(result.overallAccuracy || 0);
      var lines = [
        "Reference Year: " + referenceYear,
        "Total Samples: " + Number(result.totalSamples || 0),
        "Training Samples: " + Number(result.trainingSamples || 0),
        "Test Samples: " + Number(result.testSamples || 0),
        "Overall Accuracy: " + (overallAccuracy * 100).toFixed(2) + "%",
        "Kappa: " + Number(result.kappa || 0).toFixed(3)
      ];

      var matrix = result.matrixArray;
      if (Array.isArray(matrix) && matrix.length) {
        lines.push("", "Confusion Matrix (Actual x Predicted):");
        matrix.forEach(function (row, rowIndex) {
          var label = cfg.classes[rowIndex] ? cfg.classes[rowIndex].name : "Class " + (rowIndex + 1);
          var values = Array.isArray(row)
            ? row.map(function (value) {
                return String(Number(value || 0).toFixed(0));
              })
            : [];
          lines.push(label + ": " + values.join(" | "));
        });
      } else {
        lines.push("", "Confusion Matrix: unavailable (empty matrix).");
      }

      setBox(el.accuracyBox, lines);
    });
  }

  function trainModel() {
    if (!state.initialized) {
      setStatus(el.modelStatus, "Initialize Earth Engine before training.", true);
      return;
    }

    el.trainBtn.disabled = true;
    setStatus(el.modelStatus, "Training model...", false);
    setBox(el.accuracyBox, ["Preparing training samples..."]);

    try {
      var classifierType = el.classifierSelect.value || "Random Forest";
      var allSamples = getTrainingCollection().randomColumn("random", 42);
      state.trainingData = allSamples.filter(ee.Filter.lte("random", 0.8));
      state.testData = allSamples.filter(ee.Filter.gt("random", 0.8));

      var referenceYear = cfg.referenceYear || cfg.yearList[cfg.yearList.length - 1];
      var referenceImage = getImageryForYear(referenceYear);
      var referencePredictors = referenceImage.select(MODEL_BANDS).unmask(0);

      var trainingSample = referencePredictors.sampleRegions({
        collection: state.trainingData,
        scale: cfg.scale || 30,
        properties: ["class"],
        tileScale: 4
      });

      var classifier = getClassifier(classifierType);
      state.model = classifier.train({
        features: trainingSample,
        classProperty: "class",
        inputProperties: MODEL_BANDS
      });

      state.lulcCollection = ee.ImageCollection(
        cfg.yearList.map(function (year) {
          var yearlyImage = getImageryForYear(year);
          var classified = yearlyImage
            .select(MODEL_BANDS)
            .unmask(0)
            .classify(state.model)
            .rename("LULC")
            .focal_mode({ radius: 1, units: "pixels", iterations: 1 })
            .unmask(cfg.classes[0] && cfg.classes[0].id ? cfg.classes[0].id : 1)
            .toByte()
            .clip(state.aoi);
          return classified.set("year", year, "system:time_start", ee.Date.fromYMD(year, 1, 1));
        })
      );

      calculateAccuracy(referenceImage, referenceYear);

      state.lulcCollection.size().evaluate(function (size, err) {
        el.trainBtn.disabled = false;

        if (err) {
          setStatus(el.modelStatus, "Model training failed: " + (err.message || String(err)), true);
          return;
        }

        if (!size) {
          setStatus(el.modelStatus, "Model training failed: no yearly maps were generated.", true);
          return;
        }

        enableAnalysisControls();
        setStatus(el.modelStatus, "Model trained with " + classifierType + " (" + size + " yearly maps).", false);
        updateMap(parseInt(el.yearSelect.value, 10));
      });
    } catch (err) {
      el.trainBtn.disabled = false;
      setStatus(el.modelStatus, "Model training failed: " + (err.message || String(err)), true);
      console.error("[TRAIN] Error:", err);
    }
  }

  function updateMap(year) {
    if (!state.lulcCollection || !state.model) {
      setBox(el.statsBox, ["Train the model first to display yearly LULC layers."]);
      return;
    }

    var selectedYear = parseInt(year, 10);
    if (isNaN(selectedYear)) {
      selectedYear = cfg.yearList[0];
    }

    setBox(el.statsBox, ["Loading LULC layer for " + selectedYear + "..."]);

    state.currentLulc = getLulcImageForYear(selectedYear);
    state.currentImage = getImageryForYear(selectedYear);

    try {
      removeLayerIfPresent(state.currentLulcLayer);
      state.currentLulcLayer = createEeTileLayer(
        state.currentLulc,
        {
          min: 1,
          max: cfg.classes.length,
          palette: state.palette,
          format: "png"
        },
        0.85
      );
      registerManagedLayer("lulc-current", "LULC " + selectedYear, state.currentLulcLayer, {
        visible: true
      });
    } catch (err) {
      setBox(el.statsBox, ["Failed to render map layer: " + (err.message || String(err))]);
      return;
    }

    calculateStats(state.currentLulc, selectedYear);
  }

  function calculateStats(lulcImage, year) {
    reduceAreaByClass(
      lulcImage,
      function (result) {
        var areaByClass = resultGroupsToAreaMap(result);
        setBox(el.statsBox, buildAreaLines("Area by Class (ha) - " + year, areaByClass));
      },
      function (err) {
        setBox(el.statsBox, ["Area statistics failed: " + (err.message || String(err))]);
      }
    );
  }

  function runChangeDetection() {
    if (!state.lulcCollection) {
      setBox(el.changeBox, ["Train the model first before running change detection."]);
      return;
    }

    var fromYear = parseInt(el.fromYearSelect.value, 10);
    var toYear = parseInt(el.toYearSelect.value, 10);

    if (isNaN(fromYear) || isNaN(toYear) || fromYear >= toYear) {
      setBox(el.changeBox, ["Invalid year range. Select From year earlier than To year."]);
      return;
    }

    setBox(el.changeBox, ["Calculating changes from " + fromYear + " to " + toYear + "..."]);

    var lulcFrom = getLulcImageForYear(fromYear);
    var lulcTo = getLulcImageForYear(toYear);

    try {
      removeLayerIfPresent(state.currentChangeLayer);
      state.currentChangeLayer = createEeTileLayer(
        ee.Image(lulcFrom).neq(ee.Image(lulcTo)).selfMask().rename("change"),
        {
          min: 0,
          max: 1,
          palette: ["ff9f1a"],
          format: "png"
        },
        0.65
      );
      registerManagedLayer("change-map", "Change " + fromYear + " to " + toYear, state.currentChangeLayer, {
        visible: true
      });
    } catch (err) {
      console.warn("[CHANGE] Could not render change layer:", err);
    }

    reduceAreaByClass(
      lulcFrom,
      function (fromResult) {
        reduceAreaByClass(
          lulcTo,
          function (toResult) {
            var fromArea = resultGroupsToAreaMap(fromResult);
            var toArea = resultGroupsToAreaMap(toResult);
            var lines = ["Net Area Change (ha) from " + fromYear + " to " + toYear];

            cfg.classes.forEach(function (klass) {
              var before = Number(fromArea[klass.id] || 0);
              var after = Number(toArea[klass.id] || 0);
              var diff = after - before;
              var sign = diff > 0 ? "+" : "";
              lines.push(klass.name + ": " + sign + diff.toFixed(2) + " ha");
            });

            setBox(el.changeBox, lines);
          },
          function (err) {
            setBox(el.changeBox, ["Failed to compute destination-year area stats: " + (err.message || String(err))]);
          }
        );
      },
      function (err) {
        setBox(el.changeBox, ["Failed to compute baseline-year area stats: " + (err.message || String(err))]);
      }
    );
  }

  function hexToRgba(hex, alpha) {
    var clean = String(hex || "#000000").replace("#", "");
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map(function (ch) {
          return ch + ch;
        })
        .join("");
    }

    var r = parseInt(clean.substring(0, 2), 16);
    var g = parseInt(clean.substring(2, 4), 16);
    var b = parseInt(clean.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  async function generateTrendChart() {
    if (!state.lulcCollection) {
      setStatus(el.modelStatus, "Train the model before generating trend charts.", true);
      return;
    }

    if (typeof Chart === "undefined") {
      setStatus(el.modelStatus, "Trend chart cannot render because Chart.js is not loaded.", true);
      return;
    }

    setStatus(el.modelStatus, "Generating trend chart...", false);

    var yearResults = {};
    var index = 0;

    if (state.trendChart) {
      state.trendChart.destroy();
      state.trendChart = null;
    }

    var processNextYear = function () {
      if (index >= cfg.yearList.length) {
        var labels = cfg.yearList.map(String);
        var dataByClass = {};

        cfg.classes.forEach(function (klass) {
          dataByClass[klass.id] = new Array(labels.length).fill(0);
        });

        cfg.yearList.forEach(function (year, idx) {
          var areaByClass = resultGroupsToAreaMap(yearResults[year]);
          cfg.classes.forEach(function (klass) {
            dataByClass[klass.id][idx] = Number(areaByClass[klass.id] || 0);
          });
        });

        var datasets = cfg.classes.map(function (klass) {
          return {
            label: klass.name,
            data: dataByClass[klass.id],
            borderColor: klass.color,
            backgroundColor: hexToRgba(klass.color, 0.2),
            borderWidth: 2,
            tension: 0.25,
            fill: false,
            pointRadius: 2
          };
        });

        state.trendChart = new Chart(el.trendChartCanvas, {
          type: "line",
          data: {
            labels: labels,
            datasets: datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: "index",
              intersect: false
            },
            plugins: {
              legend: {
                position: "bottom"
              },
              title: {
                display: true,
                text: "LULC Area Trend (ha)"
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Year"
                }
              },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "Area (ha)"
                }
              }
            }
          }
        });

        setStatus(el.modelStatus, "Trend chart generated.", false);
        return;
      }

      var year = cfg.yearList[index];
      var yearImage = getLulcImageForYear(year);

      reduceAreaByClass(
        yearImage,
        function (result) {
          yearResults[year] = result;
          index += 1;
          setStatus(el.modelStatus, "Generating trend chart... (" + index + "/" + cfg.yearList.length + ")", false);
          processNextYear();
        },
        function () {
          yearResults[year] = { groups: [] };
          index += 1;
          processNextYear();
        }
      );
    };

    processNextYear();
  }

  function inspectLocation(lat, lng) {
    if (!state.currentLulc || !state.currentImage) {
      setBox(el.inspectorBox, ["Select a classified year layer first, then click map to inspect."]);
      return;
    }

    setBox(el.inspectorBox, ["Inspecting location at " + lat.toFixed(5) + ", " + lng.toFixed(5) + "..."]);

    var point = ee.Geometry.Point([lng, lat]);
    var inspectImage = ee
      .Image(state.currentImage)
      .select(["NDVI", "NDBI", "MNDWI", "EVI", "BSI", "UI"])
      .addBands(ee.Image(state.currentLulc).rename("LULC"));

    inspectImage
      .reduceRegion({
        reducer: ee.Reducer.first(),
        geometry: point,
        scale: cfg.scale || 30,
        maxPixels: 1e7,
        bestEffort: true
      })
      .evaluate(function (result, err) {
        if (err) {
          setBox(el.inspectorBox, ["Inspector failed: " + (err.message || String(err))]);
          return;
        }

        if (!result) {
          setBox(el.inspectorBox, ["No data found at this location."]);
          return;
        }

        var classId = parseInt(result.LULC, 10);
        var classLabel = "Unknown";
        cfg.classes.forEach(function (klass) {
          if (klass.id === classId) {
            classLabel = klass.name;
          }
        });

        var ndvi = result.NDVI == null ? "n/a" : Number(result.NDVI).toFixed(3);
        var ndbi = result.NDBI == null ? "n/a" : Number(result.NDBI).toFixed(3);
        var mndwi = result.MNDWI == null ? "n/a" : Number(result.MNDWI).toFixed(3);
        var evi = result.EVI == null ? "n/a" : Number(result.EVI).toFixed(3);
        var bsi = result.BSI == null ? "n/a" : Number(result.BSI).toFixed(3);
        var ui = result.UI == null ? "n/a" : Number(result.UI).toFixed(3);

        setBox(el.inspectorBox, [
          "Lat: " + lat.toFixed(5) + ", Lng: " + lng.toFixed(5),
          "Class: " + classLabel + " (" + classId + ")",
          "NDVI: " + ndvi,
          "NDBI: " + ndbi,
          "MNDWI: " + mndwi,
          "EVI: " + evi,
          "BSI: " + bsi,
          "UI: " + ui
        ]);
      });
  }

  function destroyChartInstance(chartName) {
    if (state[chartName] && typeof state[chartName].destroy === "function") {
      state[chartName].destroy();
      state[chartName] = null;
    }
  }

  function renderChart(chartName, canvas, config) {
    if (!canvas) {
      return;
    }

    destroyChartInstance(chartName);
    state[chartName] = new Chart(canvas, config);
  }

  function setAdvancedSummary(lines) {
    if (el.advancedChartSummary) {
      setBox(el.advancedChartSummary, lines);
    }
  }

  function setPredictionSummary(lines) {
    if (el.predictionStatsBox) {
      setBox(el.predictionStatsBox, lines);
    }
  }

  function setModisSummary(lines) {
    if (el.modisStatusBox) {
      setBox(el.modisStatusBox, lines);
    }
  }

  function setExportSummary(lines) {
    if (el.exportStatusBox) {
      setBox(el.exportStatusBox, lines);
    }
  }

  function getLulcImageForYear(year) {
    var parsedYear = parseInt(year, 10);
    var classFallbackId = cfg.classes[0] && cfg.classes[0].id ? cfg.classes[0].id : 1;
    var emptyFallback = ee.Image.constant(classFallbackId).rename("LULC").toByte().clip(state.aoi);

    if (!state.lulcCollection) {
      return emptyFallback;
    }

    var collection = ee.ImageCollection(state.lulcCollection);
    var filtered = collection.filter(ee.Filter.eq("year", parsedYear));
    var collectionSize = collection.size();
    var fromProperty = ee.Image(filtered.first());
    var firstImage = ee.Image(collection.sort("year").first());

    return ee.Image(
      ee.Algorithms.If(
        collectionSize.gt(0),
        ee.Algorithms.If(filtered.size().gt(0), fromProperty, firstImage),
        emptyFallback
      )
    )
      .rename("LULC")
      .toByte();
  }

  function getYearlyAreaStats(callback, progressCallback) {
    var index = 0;
    var results = {};

    var processNext = function () {
      if (index >= cfg.yearList.length) {
        callback(results);
        return;
      }

      var year = cfg.yearList[index];
      var image = getLulcImageForYear(year);

      reduceAreaByClass(
        image,
        function (result) {
          results[year] = result;
          index += 1;
          if (progressCallback) {
            progressCallback(index, cfg.yearList.length, year);
          }
          processNext();
        },
        function () {
          results[year] = { groups: [] };
          index += 1;
          processNext();
        }
      );
    };

    processNext();
  }

  function generateSelectedChart() {
    if (!state.lulcCollection) {
      setAdvancedSummary(["Train the model first to enable advanced charts."]);
      return;
    }

    if (!el.advancedChartType) {
      return;
    }

    var chartType = el.advancedChartType.value;
    if (chartType === "Stacked Area Chart") {
      generateStackedAreaChart();
      return;
    }

    if (chartType === "Change Matrix") {
      generateChangeMatrixChart();
      return;
    }

    if (chartType === "Classification Confidence") {
      generateClassificationConfidenceChart();
      return;
    }

    if (chartType === "NDVI by LULC Class") {
      generateNdviByClassChart();
      return;
    }

    if (chartType === "Net Change Bar Chart") {
      generateNetChangeBarChart();
    }
  }

  function generateStackedAreaChart() {
    setAdvancedSummary(["Generating stacked area chart..."]);

    getYearlyAreaStats(function (results) {
      var labels = cfg.yearList.map(String);
      var datasets = cfg.classes.map(function (klass) {
        return {
          label: klass.name,
          data: cfg.yearList.map(function (year) {
            var areaByClass = resultGroupsToAreaMap(results[year]);
            return Number(areaByClass[klass.id] || 0);
          }),
          borderColor: klass.color,
          backgroundColor: hexToRgba(klass.color, 0.3),
          borderWidth: 2,
          fill: true,
          stack: "lulc"
        };
      });

      renderChart("advancedChart", el.advancedChartCanvas, {
        type: "line",
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false
          },
          plugins: {
            legend: { position: "bottom" },
            title: { display: true, text: "Stacked LULC Area Over Time" }
          },
          scales: {
            x: { title: { display: true, text: "Year" } },
            y: {
              stacked: true,
              beginAtZero: true,
              title: { display: true, text: "Area (ha)" }
            }
          }
        }
      });

      setAdvancedSummary(["Stacked area chart generated successfully."]);
    });
  }

  function generateChangeMatrixChart() {
    var fromYear = parseInt(el.advancedYearFrom.value, 10);
    var toYear = parseInt(el.advancedYearTo.value, 10);

    if (isNaN(fromYear) || isNaN(toYear) || fromYear >= toYear) {
      setAdvancedSummary(["Choose a valid year range (From < To)."]);
      return;
    }

    setAdvancedSummary(["Computing change matrix from " + fromYear + " to " + toYear + "..."]);

    var lulcFrom = getLulcImageForYear(fromYear);
    var lulcTo = getLulcImageForYear(toYear);
    var combined = ee.Image(lulcFrom).multiply(100).add(ee.Image(lulcTo)).rename("transition");

    var histogram = ee.Dictionary(
      combined.reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(),
        geometry: state.aoi,
        scale: cfg.scale || 30,
        maxPixels: 1e9,
        tileScale: 4,
        bestEffort: true
      }).get("transition")
    );

    histogram.evaluate(function (result, err) {
      if (err) {
        setAdvancedSummary(["Change matrix failed: " + (err.message || String(err))]);
        return;
      }

      var entries = [];
      Object.keys(result || {}).forEach(function (key) {
        var code = parseInt(key, 10);
        var fromClass = Math.floor(code / 100);
        var toClass = code % 100;
        var count = Number(result[key] || 0);

        if (fromClass < 1 || fromClass > cfg.classes.length || toClass < 1 || toClass > cfg.classes.length || !count) {
          return;
        }

        var areaHa = (count * (cfg.scale || 30) * (cfg.scale || 30)) / 10000;
        entries.push({
          fromClass: fromClass,
          toClass: toClass,
          areaHa: areaHa,
          label:
            cfg.classes[fromClass - 1].name +
            " -> " +
            cfg.classes[toClass - 1].name
        });
      });

      entries.sort(function (a, b) {
        return b.areaHa - a.areaHa;
      });

      var top = entries.slice(0, 12);
      renderChart("advancedChart", el.advancedChartCanvas, {
        type: "bar",
        data: {
          labels: top.map(function (item) {
            return item.label;
          }),
          datasets: [
            {
              label: "Transition Area (ha)",
              data: top.map(function (item) {
                return item.areaHa;
              }),
              backgroundColor: "rgba(26,119,179,0.75)",
              borderColor: "rgba(13,79,125,1)",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Top Transitions: " + fromYear + " to " + toYear }
          },
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: "Area (ha)" }
            }
          }
        }
      });

      if (!top.length) {
        setAdvancedSummary(["No significant transitions found for selected years."]);
        return;
      }

      var lines = ["Top transitions " + fromYear + " to " + toYear + " (ha):"];
      top.forEach(function (item) {
        lines.push(item.label + ": " + item.areaHa.toFixed(2));
      });
      setAdvancedSummary(lines);
    });
  }

  function generateClassificationConfidenceChart() {
    var year = parseInt(el.advancedYearSingle.value, 10);
    if (isNaN(year)) {
      setAdvancedSummary(["Select a year for confidence chart."]);
      return;
    }

    setAdvancedSummary(["Computing class distribution for " + year + "..."]);

    var lulc = getLulcImageForYear(year);
    var hist = ee.Dictionary(
      ee.Image(lulc)
        .reduceRegion({
          reducer: ee.Reducer.frequencyHistogram(),
          geometry: state.aoi,
          scale: cfg.scale || 30,
          maxPixels: 1e9,
          tileScale: 4,
          bestEffort: true
        })
        .get("LULC")
    );

    hist.evaluate(function (result, err) {
      if (err) {
        setAdvancedSummary(["Confidence chart failed: " + (err.message || String(err))]);
        return;
      }

      var labels = cfg.classes.map(function (klass) {
        return klass.name;
      });

      var values = cfg.classes.map(function (klass) {
        return Number((result || {})[klass.id] || 0);
      });

      renderChart("advancedChart", el.advancedChartCanvas, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Pixel Count",
              data: values,
              backgroundColor: cfg.classes.map(function (klass) {
                return hexToRgba(klass.color, 0.7);
              }),
              borderColor: cfg.classes.map(function (klass) {
                return klass.color;
              }),
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Classification Distribution - " + year }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Pixel Count" }
            }
          }
        }
      });

      setAdvancedSummary(["Class distribution chart generated for " + year + "."]);
    });
  }

  function generateNdviByClassChart() {
    var year = parseInt(el.advancedYearSingle.value, 10);
    if (isNaN(year)) {
      setAdvancedSummary(["Select a year for NDVI by class chart."]);
      return;
    }

    setAdvancedSummary(["Calculating NDVI means by class for " + year + "..."]);

    var lulc = getLulcImageForYear(year);
    var ndvi = getImageryForYear(year).select("NDVI");

    var grouped = ndvi
      .addBands(ee.Image(lulc).rename("class"))
      .reduceRegion({
        reducer: ee.Reducer.mean().group({ groupField: 1, groupName: "class" }),
        geometry: state.aoi,
        scale: cfg.scale || 30,
        maxPixels: 1e9,
        tileScale: 4,
        bestEffort: true
      });

    grouped.evaluate(function (result, err) {
      if (err) {
        setAdvancedSummary(["NDVI by class chart failed: " + (err.message || String(err))]);
        return;
      }

      var means = {};
      (result && result.groups ? result.groups : []).forEach(function (group) {
        means[parseInt(group.class, 10)] = Number(group.mean || 0);
      });

      var labels = cfg.classes.map(function (klass) {
        return klass.name;
      });
      var values = cfg.classes.map(function (klass) {
        return Number(means[klass.id] || 0);
      });

      renderChart("advancedChart", el.advancedChartCanvas, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Mean NDVI",
              data: values,
              backgroundColor: cfg.classes.map(function (klass) {
                return hexToRgba(klass.color, 0.7);
              }),
              borderColor: cfg.classes.map(function (klass) {
                return klass.color;
              }),
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Mean NDVI by LULC Class - " + year }
          },
          scales: {
            y: {
              min: -1,
              max: 1,
              title: { display: true, text: "NDVI" }
            }
          }
        }
      });

      setAdvancedSummary(["NDVI by class chart generated for " + year + "."]);
    });
  }

  function generateNetChangeBarChart() {
    var fromYear = parseInt(el.advancedYearFrom.value, 10);
    var toYear = parseInt(el.advancedYearTo.value, 10);

    if (isNaN(fromYear) || isNaN(toYear) || fromYear >= toYear) {
      setAdvancedSummary(["Choose a valid year range (From < To)."]);
      return;
    }

    setAdvancedSummary(["Computing net change by class..."]);

    var fromImage = getLulcImageForYear(fromYear);
    var toImage = getLulcImageForYear(toYear);

    reduceAreaByClass(
      fromImage,
      function (fromResult) {
        reduceAreaByClass(
          toImage,
          function (toResult) {
            var fromArea = resultGroupsToAreaMap(fromResult);
            var toArea = resultGroupsToAreaMap(toResult);

            var labels = cfg.classes.map(function (klass) {
              return klass.name;
            });

            var values = cfg.classes.map(function (klass) {
              return Number(toArea[klass.id] || 0) - Number(fromArea[klass.id] || 0);
            });

            renderChart("advancedChart", el.advancedChartCanvas, {
              type: "bar",
              data: {
                labels: labels,
                datasets: [
                  {
                    label: "Net Change (ha)",
                    data: values,
                    backgroundColor: values.map(function (v) {
                      return v >= 0 ? "rgba(15,138,88,0.75)" : "rgba(194,60,35,0.75)";
                    }),
                    borderColor: values.map(function (v) {
                      return v >= 0 ? "#0f8a58" : "#c23c23";
                    }),
                    borderWidth: 1
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  title: {
                    display: true,
                    text: "Net Change by Class (" + fromYear + " to " + toYear + ")"
                  }
                },
                scales: {
                  y: {
                    title: { display: true, text: "Change (ha)" }
                  }
                }
              }
            });

            var lines = ["Net change from " + fromYear + " to " + toYear + " (ha):"];
            cfg.classes.forEach(function (klass, idx) {
              var diff = values[idx];
              var sign = diff > 0 ? "+" : "";
              lines.push(klass.name + ": " + sign + diff.toFixed(2));
            });
            setAdvancedSummary(lines);
          },
          function (err) {
            setAdvancedSummary(["Net change failed: " + (err.message || String(err))]);
          }
        );
      },
      function (err) {
        setAdvancedSummary(["Net change failed: " + (err.message || String(err))]);
      }
    );
  }

  function buildTransitionMatrix(fromImage, toImage) {
    var combined = ee.Image(fromImage).multiply(10).add(ee.Image(toImage)).rename("transition");
    var histogram = ee.Dictionary(
      combined
        .reduceRegion({
          reducer: ee.Reducer.frequencyHistogram(),
          geometry: state.aoi,
          scale: cfg.scale || 30,
          maxPixels: 1e9,
          tileScale: 4,
          bestEffort: true
        })
        .get("transition")
    );

    var classList = ee.List.sequence(1, cfg.classes.length);
    var matrix = classList.map(function (fromClass) {
      fromClass = ee.Number(fromClass);
      var rowCounts = classList.map(function (toClass) {
        toClass = ee.Number(toClass);
        var key = fromClass.multiply(10).add(toClass).format();
        return ee.Number(histogram.get(key, 0));
      });

      var rowSum = ee.Number(ee.List(rowCounts).reduce(ee.Reducer.sum()));
      return ee.Algorithms.If(
        rowSum.gt(0),
        ee.List(rowCounts).map(function (count) {
          return ee.Number(count).divide(rowSum);
        }),
        classList.map(function (toClass) {
          return ee.Number(toClass).eq(fromClass);
        })
      );
    });

    return ee.List(matrix);
  }

  function blendTransitionMatrices(matrixA, matrixB, weightA, weightB) {
    var classIndex = ee.List.sequence(0, cfg.classes.length - 1);
    return classIndex.map(function (rowIndex) {
      rowIndex = ee.Number(rowIndex);
      var rowA = ee.List(matrixA.get(rowIndex));
      var rowB = ee.List(matrixB.get(rowIndex));

      return classIndex.map(function (colIndex) {
        colIndex = ee.Number(colIndex);
        var aValue = ee.Number(rowA.get(colIndex));
        var bValue = ee.Number(rowB.get(colIndex));
        return aValue.multiply(weightA).add(bValue.multiply(weightB));
      });
    });
  }

  function buildSuitabilityMaps(referenceImage) {
    var ndvi = referenceImage.select("NDVI").unitScale(-0.2, 0.8).clamp(0, 1);
    var evi = referenceImage.select("EVI").unitScale(-0.1, 0.7).clamp(0, 1);
    var ndbi = referenceImage.select("NDBI").unitScale(-0.4, 0.5).clamp(0, 1);
    var mndwi = referenceImage.select("MNDWI").unitScale(-0.5, 0.6).clamp(0, 1);
    var bsi = referenceImage.select("BSI").unitScale(-0.3, 0.5).clamp(0, 1);
    var ui = referenceImage.select("UI").unitScale(-0.4, 0.5).clamp(0, 1);

    var invert = function (img) {
      return ee.Image(1).subtract(img);
    };

    var waterSuitability = mndwi.multiply(0.65).add(invert(ndbi).multiply(0.2)).add(invert(bsi).multiply(0.15)).clamp(0, 1);
    var vegetationSuitability = ndvi.multiply(0.55).add(evi.multiply(0.35)).add(invert(ndbi).multiply(0.1)).clamp(0, 1);
    var urbanSuitability = ndbi.multiply(0.45).add(ui.multiply(0.35)).add(invert(ndvi).multiply(0.2)).clamp(0, 1);
    var cultivationSuitability = ndvi
      .multiply(0.45)
      .add(invert(bsi).multiply(0.25))
      .add(invert(mndwi).multiply(0.15))
      .add(invert(ui).multiply(0.15))
      .clamp(0, 1);
    var sandSuitability = bsi.multiply(0.5).add(invert(ndvi).multiply(0.3)).add(invert(mndwi).multiply(0.2)).clamp(0, 1);
    var bareSuitability = bsi.multiply(0.5).add(ui.multiply(0.25)).add(invert(ndvi).multiply(0.25)).clamp(0, 1);

    return ee.List([
      vegetationSuitability,
      waterSuitability,
      urbanSuitability,
      cultivationSuitability,
      sandSuitability,
      bareSuitability
    ]);
  }

  function projectOneStepMarkov(currentImage, transitionMatrix, suitabilityList) {
    var preparedCurrent = ee
      .Image(currentImage)
      .unmask(ee.Image(currentImage).focal_mode({ radius: 2, units: "pixels" }))
      .unmask(4)
      .rename("LULC")
      .toByte();

    var classList = ee.List.sequence(1, cfg.classes.length);
    var scoreBands = classList.map(function (targetClass) {
      targetClass = ee.Number(targetClass);
      var targetIndex = targetClass.subtract(1);

      var transitionToTarget = classList.map(function (fromClass) {
        fromClass = ee.Number(fromClass);
        var row = ee.List(transitionMatrix.get(fromClass.subtract(1)));
        return ee.Number(row.get(targetIndex));
      });

      var transitionScore = preparedCurrent.remap(classList, transitionToTarget);
      var suitability = ee
        .Image(suitabilityList.get(targetClass.subtract(1)))
        .unmask(ee.Image(suitabilityList.get(targetClass.subtract(1))).focal_mean({ radius: 2, units: "pixels" }))
        .unmask(0.5)
        .clamp(0, 1);
      var neighborhood = preparedCurrent.eq(targetClass).focal_mean({ radius: 1, units: "pixels" });
      var persistence = preparedCurrent.eq(targetClass).multiply(0.08);

      return transitionScore
        .multiply(0.62)
        .add(suitability.multiply(0.28))
        .add(neighborhood.multiply(0.1))
        .add(persistence)
        .rename(ee.String("score_").cat(targetClass.format("%.0f")));
    });

    var stacked = ee.ImageCollection.fromImages(scoreBands).toBands();
    var predicted = stacked.toArray().arrayArgmax().arrayGet([0]).add(1).rename("LULC").toByte();

    return predicted.focal_mode({ radius: 1, units: "pixels", iterations: 1 }).rename("LULC").toByte().clip(state.aoi);
  }

  function backtestPredictionAccuracy(actualImage, predictedImage) {
    var sample = ee
      .Image(actualImage)
      .unmask(0)
      .rename("actual")
      .addBands(ee.Image(predictedImage).unmask(0).rename("predicted"))
      .sample({
        region: state.aoi,
        scale: cfg.scale || 30,
        numPixels: 6000,
        seed: 42,
        geometries: false,
        tileScale: 4
      });

    return {
      sample: sample,
      matrix: sample.errorMatrix("actual", "predicted")
    };
  }

  function calculateStatsToBox(image, year, boxNode, titlePrefix) {
    reduceAreaByClass(
      image,
      function (result) {
        var areaByClass = resultGroupsToAreaMap(result);
        var lines = buildAreaLines(titlePrefix + " " + year, areaByClass);
        setBox(boxNode, lines);
      },
      function (err) {
        setBox(boxNode, ["Failed to compute area stats: " + (err.message || String(err))]);
      }
    );
  }

  function generateFuturePredictions() {
    if (!state.lulcCollection) {
      setStatus(el.predictionStatus, "Train model first to generate predictions.", true);
      return;
    }

    var availableYears = cfg.yearList
      .slice()
      .map(function (year) {
        return parseInt(year, 10);
      })
      .filter(function (year) {
        return !isNaN(year);
      })
      .sort(function (a, b) {
        return a - b;
      });

    if (availableYears.length < 3) {
      setStatus(el.predictionStatus, "At least 3 historical years are needed for future prediction.", true);
      return;
    }

    setStatus(el.predictionStatus, "Generating CA-Markov predictions...", false);
    setPredictionSummary(["Building transition matrices and running back-test..."]);

    var y1 = availableYears[availableYears.length - 3];
    var y2 = availableYears[availableYears.length - 2];
    var y3 = availableYears[availableYears.length - 1];

    var lulcY1 = getLulcImageForYear(y1);
    var lulcY2 = getLulcImageForYear(y2);
    var lulcY3 = getLulcImageForYear(y3);

    var transitionA = buildTransitionMatrix(lulcY1, lulcY2);
    var transitionB = buildTransitionMatrix(lulcY2, lulcY3);
    var blendedTransition = blendTransitionMatrices(transitionA, transitionB, 0.35, 0.65);
    var suitability = buildSuitabilityMaps(getImageryForYear(y3));

    var pred2030 = projectOneStepMarkov(lulcY3, blendedTransition, suitability).set("year", 2030);
    var pred2035 = projectOneStepMarkov(pred2030, blendedTransition, suitability).set("year", 2035);
    var pred2040 = projectOneStepMarkov(pred2035, blendedTransition, suitability).set("year", 2040);
    var pred2045 = projectOneStepMarkov(pred2040, blendedTransition, suitability).set("year", 2045);
    var pred2050 = projectOneStepMarkov(pred2045, blendedTransition, suitability).set("year", 2050);

    state.futureLulcCollection = ee.ImageCollection([pred2030, pred2040, pred2050]);

    var backtestPrediction = projectOneStepMarkov(lulcY2, transitionA, suitability);
    var validation = backtestPredictionAccuracy(lulcY3, backtestPrediction);

    validation.sample.size().evaluate(function (sampleCount) {
      if (!sampleCount || sampleCount <= 0) {
        state.futureValidation = { overallAccuracy: null, kappa: null };
        setStatus(el.predictionStatus, "Predictions ready. Validation unavailable due to empty sample.", false);
        setPredictionSummary([
          "Forecast Validation",
          "No valid sample pixels were available for back-test.",
          "Select year and click Show Predicted Map."
        ]);
        return;
      }

      validation.matrix.accuracy().evaluate(function (accuracy) {
        validation.matrix.kappa().evaluate(function (kappa) {
          state.futureValidation = {
            overallAccuracy: accuracy,
            kappa: kappa
          };

          var accuracyPct = accuracy == null ? "N/A" : (Number(accuracy) * 100).toFixed(2) + "%";
          var kappaText = kappa == null ? "N/A" : Number(kappa).toFixed(3);

          setStatus(el.predictionStatus, "Predictions ready. Back-test accuracy: " + accuracyPct + ".", false);
          setPredictionSummary([
            "Forecast Validation (back-test)",
            "Historical transition years: " + y1 + " -> " + y2 + " -> " + y3,
            "Sample Size: " + sampleCount,
            "Overall Accuracy: " + accuracyPct,
            "Kappa: " + kappaText,
            "Select future year and click Show Predicted Map."
          ]);
        });
      });
    });
  }

  function showFuturePrediction() {
    if (!state.futureLulcCollection) {
      setStatus(el.predictionStatus, "Generate predictions first.", true);
      return;
    }

    var targetYear = parseInt(el.predictionYearSelect.value, 10);
    if (isNaN(targetYear)) {
      setStatus(el.predictionStatus, "Choose a prediction year.", true);
      return;
    }

    var predictionImage = state.futureLulcCollection.filter(ee.Filter.eq("year", targetYear)).first();

    try {
      removeLayerIfPresent(state.currentPredictionLayer);
      state.currentPredictionLayer = createEeTileLayer(
        predictionImage,
        {
          min: 1,
          max: cfg.classes.length,
          palette: state.palette,
          format: "png"
        },
        0.85
      );

      registerManagedLayer("prediction-map", "Predicted LULC " + targetYear, state.currentPredictionLayer, {
        visible: true
      });
    } catch (err) {
      setStatus(el.predictionStatus, "Failed to render prediction layer: " + (err.message || String(err)), true);
      return;
    }

    calculateStatsToBox(predictionImage, targetYear, el.predictionStatsBox, "Predicted Area by Class (ha) -");
    setStatus(el.predictionStatus, "Showing predicted map for " + targetYear + ".", false);
  }

  function getDownloadUrlWithFallback(eeObject, params, callback) {
    try {
      var direct = eeObject.getDownloadURL(params, function (url) {
        callback(url, null);
      });

      if (typeof direct === "string") {
        callback(direct, null);
      }
    } catch (err) {
      callback(null, err);
    }
  }

  function exportVector() {
    if (!state.currentLulc) {
      setExportSummary(["Display a classified year first, then export vectors."]);
      return;
    }

    var classId = parseInt(el.exportClassSelect.value, 10);
    if (isNaN(classId)) {
      setExportSummary(["Select a valid class to export."]);
      return;
    }

    setExportSummary(["Preparing vector export..."]);

    var classLabel = cfg.classes.filter(function (klass) {
      return klass.id === classId;
    })[0];

    var className = classLabel ? classLabel.name : "Class_" + classId;
    var vectorImage = ee.Image(state.currentLulc).eq(classId).selfMask();
    var vectors = vectorImage.reduceToVectors({
      geometry: state.aoi,
      scale: cfg.scale || 30,
      crs: "EPSG:4326",
      maxPixels: 1e10,
      bestEffort: true
    });

    getDownloadUrlWithFallback(
      vectors,
      {
        format: "SHP",
        filename: "LULC_Vector_" + className.replace(/\s+/g, "_")
      },
      function (url, err) {
        if (err || !url) {
          setExportSummary(["Vector export failed: " + ((err && err.message) || "Unable to generate URL")]);
          return;
        }

        setExportSummary(["Vector export URL generated:", url]);
      }
    );
  }

  function exportImage() {
    if (!state.currentLulc) {
      setExportSummary(["Display a classified year first, then export raster."]);
      return;
    }

    var year = el.yearSelect ? el.yearSelect.value : "Current";
    setExportSummary(["Preparing GeoTIFF export..."]);

    getDownloadUrlWithFallback(
      ee.Image(state.currentLulc),
      {
        name: "LULC_Raster_" + year,
        scale: cfg.scale || 30,
        region: state.aoi,
        crs: "EPSG:4326",
        format: "GEO_TIFF"
      },
      function (url, err) {
        if (err || !url) {
          setExportSummary(["Raster export failed: " + ((err && err.message) || "Unable to generate URL")]);
          return;
        }

        setExportSummary(["GeoTIFF export URL generated:", url]);
      }
    );
  }

  function exportVideo() {
    if (!state.lulcCollection) {
      setExportSummary(["Train model first to export time-lapse video."]);
      return;
    }

    setExportSummary(["Preparing time-lapse GIF export URL..."]);

    var rgbCollection = state.lulcCollection.map(function (image) {
      return ee.Image(image).visualize({
        min: 1,
        max: cfg.classes.length,
        palette: state.palette
      });
    });

    try {
      var url = rgbCollection.getVideoThumbURL({
        dimensions: 768,
        framesPerSecond: 1,
        region: state.aoi,
        crs: "EPSG:4326"
      });
      setExportSummary(["Time-lapse GIF URL generated:", url]);
    } catch (err) {
      setExportSummary(["Video export failed: " + (err.message || String(err))]);
    }
  }

  function getMODISData(startYear, endYear) {
    var start = ee.Date.fromYMD(startYear, 1, 1);
    var end = ee.Date.fromYMD(endYear, 12, 31);
    return MODIS_NDVI
      .filterDate(start, end)
      .filterBounds(state.aoi)
      .select(["NDVI", "EVI"])
      .map(function (image) {
        return image.multiply(0.0001).copyProperties(image, ["system:time_start"]);
      });
  }

  function generateMODISTrend() {
    if (!state.initialized) {
      setModisSummary(["Initialize Earth Engine first to use MODIS tools."]);
      return;
    }

    setModisSummary(["Generating annual MODIS NDVI trend (2001-2025)..."]);

    var years = ee.List.sequence(2001, 2025);
    var features = ee.FeatureCollection(
      years.map(function (year) {
        year = ee.Number(year);
        var image = MODIS_NDVI
          .filterDate(ee.Date.fromYMD(year, 1, 1), ee.Date.fromYMD(year, 12, 31))
          .filterBounds(state.aoi)
          .select("NDVI")
          .map(function (item) {
            return item.multiply(0.0001);
          })
          .mean();

        var value = ee.Number(
          image.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: state.aoi,
            scale: 250,
            maxPixels: 1e9,
            bestEffort: true
          }).get("NDVI", 0)
        );

        return ee.Feature(null, {
          year: year,
          ndvi: value
        });
      })
    );

    features.evaluate(function (result, err) {
      if (err) {
        setModisSummary(["MODIS trend failed: " + (err.message || String(err))]);
        return;
      }

      var rows = (result && result.features ? result.features : []).map(function (feature) {
        return feature.properties;
      });

      rows.sort(function (a, b) {
        return a.year - b.year;
      });

      renderChart("modisChart", el.modisChartCanvas, {
        type: "line",
        data: {
          labels: rows.map(function (row) {
            return String(row.year);
          }),
          datasets: [
            {
              label: "MODIS NDVI",
              data: rows.map(function (row) {
                return Number(row.ndvi || 0);
              }),
              borderColor: "#177e52",
              backgroundColor: "rgba(23,126,82,0.25)",
              fill: false,
              tension: 0.25,
              pointRadius: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true },
            title: { display: true, text: "Annual MODIS NDVI Trend" }
          },
          scales: {
            y: {
              min: -0.2,
              max: 1,
              title: { display: true, text: "NDVI" }
            }
          }
        }
      });

      setModisSummary(["MODIS NDVI trend generated."]);
    });
  }

  function getNDVIAnomalyImage() {
    var baseline = MODIS_NDVI
      .filterDate("2000-01-01", "2015-12-31")
      .filterBounds(state.aoi)
      .select("NDVI")
      .map(function (image) {
        return image.multiply(0.0001);
      })
      .mean();

    var current = MODIS_NDVI
      .filterDate("2023-01-01", "2024-12-31")
      .filterBounds(state.aoi)
      .select("NDVI")
      .map(function (image) {
        return image.multiply(0.0001);
      })
      .mean();

    return current.subtract(baseline).rename("NDVI_Anomaly").clip(state.aoi);
  }

  function generateNDVIAnomaly() {
    if (!state.initialized) {
      setModisSummary(["Initialize Earth Engine first."]);
      return;
    }

    state.modisAnomalyImage = getNDVIAnomalyImage();

    try {
      removeLayerIfPresent(state.modisAnomalyLayer);
      state.modisAnomalyLayer = createEeTileLayer(
        state.modisAnomalyImage,
        {
          min: -0.2,
          max: 0.2,
          palette: ["ff0000", "ffffff", "00a600"],
          format: "png"
        },
        0.8
      );

      registerManagedLayer("modis-ndvi-anomaly", "MODIS NDVI Anomaly", state.modisAnomalyLayer, { visible: true });
      setModisSummary(["NDVI anomaly layer added."]);
    } catch (err) {
      setModisSummary(["Failed to add NDVI anomaly layer: " + (err.message || String(err))]);
    }
  }

  function showDroughtAreas() {
    if (!state.initialized) {
      setModisSummary(["Initialize Earth Engine first."]);
      return;
    }

    if (!state.modisAnomalyImage) {
      state.modisAnomalyImage = getNDVIAnomalyImage();
    }

    var drought = ee.Image(state.modisAnomalyImage).lt(-0.1).selfMask().rename("Drought");

    try {
      removeLayerIfPresent(state.droughtLayer);
      state.droughtLayer = createEeTileLayer(
        drought,
        {
          min: 0,
          max: 1,
          palette: ["8b4513"],
          format: "png"
        },
        0.75
      );

      registerManagedLayer("modis-drought", "MODIS Drought Areas", state.droughtLayer, { visible: true });
      setModisSummary(["Drought mask layer added."]);
    } catch (err) {
      setModisSummary(["Failed to add drought layer: " + (err.message || String(err))]);
    }
  }

  function showLST() {
    if (!state.initialized) {
      setModisSummary(["Initialize Earth Engine first."]);
      return;
    }

    var lst = MODIS_LST
      .filterDate("2024-01-01", "2024-12-31")
      .filterBounds(state.aoi)
      .select("LST_Day_1km")
      .mean()
      .multiply(0.02)
      .subtract(273.15)
      .clip(state.aoi);

    try {
      removeLayerIfPresent(state.lstLayer);
      state.lstLayer = createEeTileLayer(
        lst,
        {
          min: 15,
          max: 45,
          palette: ["0000ff", "00ff00", "ffff00", "ff0000"],
          format: "png"
        },
        0.7
      );

      registerManagedLayer("modis-lst", "MODIS Land Surface Temperature", state.lstLayer, { visible: true });
      setModisSummary(["Land Surface Temperature layer added."]);
    } catch (err) {
      setModisSummary(["Failed to add LST layer: " + (err.message || String(err))]);
    }
  }

  function showFires() {
    if (!state.initialized) {
      setModisSummary(["Initialize Earth Engine first."]);
      return;
    }

    var fires = MODIS_FIRE
      .filterDate("2024-01-01", "2024-12-31")
      .filterBounds(state.aoi)
      .select("FireMask")
      .mean()
      .clip(state.aoi);

    try {
      removeLayerIfPresent(state.fireLayer);
      state.fireLayer = createEeTileLayer(
        fires,
        {
          min: 0,
          max: 9,
          palette: ["000000", "ff9900", "ff0000"],
          format: "png"
        },
        0.75
      );

      registerManagedLayer("modis-fire", "MODIS Active Fires", state.fireLayer, { visible: true });
      setModisSummary(["Active fires layer added."]);
    } catch (err) {
      setModisSummary(["Failed to add fire layer: " + (err.message || String(err))]);
    }
  }

  function seasonalNDVI() {
    if (!state.initialized) {
      setModisSummary(["Initialize Earth Engine first."]);
      return;
    }

    setModisSummary(["Generating seasonal NDVI chart for 2023..."]);

    var months = ee.List.sequence(1, 12);
    var seasonalFeatures = ee.FeatureCollection(
      months.map(function (month) {
        month = ee.Number(month);
        var start = ee.Date.fromYMD(2023, month, 1);
        var end = start.advance(1, "month");

        var monthlyNdvi = MODIS_NDVI
          .filterDate(start, end)
          .filterBounds(state.aoi)
          .select("NDVI")
          .map(function (image) {
            return image.multiply(0.0001);
          })
          .mean();

        var meanValue = ee.Number(
          monthlyNdvi.reduceRegion({
            reducer: ee.Reducer.mean(),
            geometry: state.aoi,
            scale: 250,
            maxPixels: 1e9,
            bestEffort: true
          }).get("NDVI", 0)
        );

        return ee.Feature(null, {
          month: month,
          ndvi: meanValue
        });
      })
    );

    seasonalFeatures.evaluate(function (result, err) {
      if (err) {
        setModisSummary(["Seasonal NDVI failed: " + (err.message || String(err))]);
        return;
      }

      var rows = (result && result.features ? result.features : []).map(function (feature) {
        return feature.properties;
      });

      rows.sort(function (a, b) {
        return a.month - b.month;
      });

      renderChart("modisChart", el.modisChartCanvas, {
        type: "line",
        data: {
          labels: rows.map(function (row) {
            return String(row.month);
          }),
          datasets: [
            {
              label: "Monthly NDVI",
              data: rows.map(function (row) {
                return Number(row.ndvi || 0);
              }),
              borderColor: "#0d4f7d",
              backgroundColor: "rgba(13,79,125,0.25)",
              fill: false,
              tension: 0.3,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true },
            title: { display: true, text: "Seasonal NDVI Cycle (2023)" }
          },
          scales: {
            x: { title: { display: true, text: "Month" } },
            y: { min: -0.2, max: 1, title: { display: true, text: "NDVI" } }
          }
        }
      });

      setModisSummary(["Seasonal NDVI chart generated."]);
    });
  }

  function exportNDVIAnomaly() {
    if (!state.initialized) {
      setModisSummary(["Initialize Earth Engine first."]);
      return;
    }

    if (!state.modisAnomalyImage) {
      state.modisAnomalyImage = getNDVIAnomalyImage();
    }

    setModisSummary(["Preparing NDVI anomaly GeoTIFF export URL..."]);

    getDownloadUrlWithFallback(
      ee.Image(state.modisAnomalyImage),
      {
        name: "MODIS_NDVI_Anomaly",
        scale: 250,
        region: state.aoi,
        crs: "EPSG:4326",
        format: "GEO_TIFF"
      },
      function (url, err) {
        if (err || !url) {
          setModisSummary(["MODIS export failed: " + ((err && err.message) || "Unable to generate URL")]);
          return;
        }

        setModisSummary(["NDVI anomaly export URL generated:", url]);
      }
    );
  }

  // Export for external access
  window.LULCLeafletApp = {
    map: map,
    state: state,
    cfg: cfg,
    authenticate: authenticate,
    initializeEarthEngine: initializeEarthEngine
  };

  console.log("[INIT] Application fully initialized");
})();


