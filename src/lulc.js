// Configuration
var yearList = [1995, 2000, 2005, 2010, 2015, 2020, 2023, 2025];
var SCALE = 30;
var referenceYear = 2023;

var names = ['Vegetation', 'Water', 'Urban Area', 'Cultivation', 'Sand', 'Bare'];
var palette = ['0db21f', '1cece0', 'ff0000', '00ff00', 'f0f015', '979a5d'];

// Image processing functions
function processLandsat5(col) {
  return col
    .select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'],
            ['Blue','Green','Red','NIR','SWIR1','SWIR2'])
    .map(function(img){ return img.multiply(0.0000275).add(-0.2).clamp(0,1).copyProperties(img,['system:time_start']); });
}

function processLandsat7(col) {
  return col
    .select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'],
            ['Blue','Green','Red','NIR','SWIR1','SWIR2'])
    .map(function(img){ return img.multiply(0.0000275).add(-0.2).clamp(0,1).copyProperties(img,['system:time_start']); });
}

function processLandsat8(col) {
  return col
    .select(['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
            ['Blue','Green','Red','NIR','SWIR1','SWIR2'])
    .map(function(img){ return img.multiply(0.0000275).add(-0.2).clamp(0,1).copyProperties(img,['system:time_start']); });
}

function processSentinel2(col) {
  return col
    .select(['B2','B3','B4','B8','B11','B12'],
            ['Blue','Green','Red','NIR','SWIR1','SWIR2'])
    .map(function(img){ return img.divide(10000).clamp(0,1).copyProperties(img,['system:time_start']); });
}

function maskLandsatSR(image) {
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111',2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);
  return image.updateMask(qaMask).updateMask(saturationMask);
}

function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask);
}

function addIndices(image) {
  var ndvi = image.normalizedDifference(['NIR','Red']).rename('NDVI');
  var evi = image.expression(
    '2.5*((NIR-RED)/(NIR+6*RED-7.5*BLUE+1))',
    {NIR:image.select('NIR'), RED:image.select('Red'), BLUE:image.select('Blue')}
  ).rename('EVI');
  var ndbi = image.normalizedDifference(['SWIR1','NIR']).rename('NDBI');
  var mndwi = image.normalizedDifference(['Green','SWIR1']).rename('MNDWI');
  var bsi = image.expression(
    '((SWIR2 + RED) - (NIR + BLUE)) / ((SWIR2 + RED) + (NIR + BLUE))',
    {RED:image.select('Red'), BLUE:image.select('Blue'), NIR:image.select('NIR'), SWIR2:image.select('SWIR2')}
  ).rename('BSI');
  var ui = image.expression(
    '(SWIR1 - NIR) / (SWIR1 + NIR)',
    {SWIR1:image.select('SWIR1'), NIR:image.select('NIR')}
  ).rename('UI');
  return image.addBands([ndvi, evi, ndbi, mndwi, bsi, ui]);
}

function getImageryForYear(year) {
  var startDate = ee.Date.fromYMD(year, 10, 1);
  var endDate = ee.Date.fromYMD(year + 1, 3, 31);

  var imagery;
  if (year >= 2017) {
    var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterDate(startDate, endDate).filterBounds(aoi)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)).map(maskS2clouds);
    var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterDate(startDate, endDate).filterBounds(aoi)
      .filter(ee.Filter.lt('CLOUD_COVER', 30)).map(maskLandsatSR);
    imagery = processSentinel2(s2).merge(processLandsat8(l8));
  } else if (year >= 2013) {
    var l8b = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterDate(startDate, endDate).filterBounds(aoi)
      .filter(ee.Filter.lt('CLOUD_COVER', 30)).map(maskLandsatSR);
    imagery = processLandsat8(l8b);
  } else if (year >= 1999) {
    var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
      .filterDate(startDate, endDate).filterBounds(aoi)
      .filter(ee.Filter.lt('CLOUD_COVER', 30)).map(maskLandsatSR);
    var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
      .filterDate(startDate, endDate).filterBounds(aoi)
      .filter(ee.Filter.lt('CLOUD_COVER', 30)).map(maskLandsatSR);
    imagery = processLandsat5(l5).merge(processLandsat7(l7));
  } else {
    var l5b = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
      .filterDate(startDate, endDate).filterBounds(aoi)
      .filter(ee.Filter.lt('CLOUD_COVER', 30)).map(maskLandsatSR);
    imagery = processLandsat5(l5b);
  }

  var imageCount = imagery.size();
  var composite = ee.Algorithms.If(
    imageCount.gt(0),
    imagery.median().clip(aoi),
    ee.Image.constant(0).rename('Blue')
  );

  var bandCount = ee.Image(composite).bandNames().length();
  var finalComposite = ee.Image(ee.Algorithms.If(
    bandCount.gt(0),
    addIndices(ee.Image(composite)),
    ee.Image.constant(0).rename('Blue')
  ));

  return finalComposite.set('year', year, 'system:time_start', ee.Date.fromYMD(year, 1, 1));
}

// App State
var appState = {
  model: null,
  lulcCollection: null,
  currentLulc: null,
  currentImage: null,
  trainingData: null,
  testData: null,
  referenceImage: null,
  bandNames: null,
  trendData: null
};

// UI Setup
var mainPanel = ui.Panel({ style:{ width:'400px', padding:'10px', backgroundColor:'#f9f9f9' }});
mainPanel.add(ui.Label({ value:'🌍 Multi-Temporal LULC App', style:{ fontWeight:'bold', fontSize:'24px', margin:'10px 0 10px 10px', color:'#2c3e50' }}));
var accordion = ui.Panel({ style:{ margin:'0 5px' }});
mainPanel.add(accordion);

var mapPanel = ui.Map();
mapPanel.centerObject(aoi, 11);
mapPanel.addLayer(aoi, {color:'yellow'}, 'Study Area', true, 0.3);
mapPanel.style().set('cursor', 'crosshair');

ui.root.clear();
ui.root.add(ui.SplitPanel(mainPanel, mapPanel));

// Panel 1: Configure & Train Model
var panel_1_title = ui.Label('1. Configure & Train Model', {fontWeight:'bold', fontSize:'16px', margin:'5px 0', color:'#34495e'});
var panel_1_content = ui.Panel(null, null, {stretch:'vertical'});

var classifierSelect = ui.Select({ items:['Random Forest','SVM','CART'], value:'Random Forest', style:{margin:'5px 10px'} });
var trainButton = ui.Button('Train Model', trainModel, false, {width:'90%', margin:'5px auto', backgroundColor:'#27ae60', color:'white'});
var modelStatus = ui.Label('Model not trained.', {margin:'5px 10px'});
var accuracyPanel = ui.Panel(null, null, {margin:'5px 10px'});

panel_1_content.add(ui.Label('Select Classifier:'));
panel_1_content.add(classifierSelect);
panel_1_content.add(trainButton);
panel_1_content.add(modelStatus);
panel_1_content.add(accuracyPanel);

accordion.add(ui.Panel([panel_1_title, panel_1_content], ui.Panel.Layout.flow('vertical'), {
  backgroundColor:'#ecf0f1', padding:'8px', border:'1px solid #bdc3c7', margin:'5px 0'
}));

// Panel 2: Time-Series Explorer
var panel_2_title = ui.Label('2. Time-Series Explorer', {fontWeight:'bold', fontSize:'16px', margin:'5px 0', color:'#34495e'});
var panel_2_content = ui.Panel();
panel_2_content.style().set('shown', false);

var yearSelect = ui.Select({ items:yearList.map(String), value:String(yearList[0]), onChange:updateMap, style:{margin:'5px 10px'} });
var statsPanel = ui.Panel([ui.Label('Select a year.')], null, {margin:'5px 10px'});
var legendPanel = ui.Panel(null, null, {margin:'5px 10px'});

panel_2_content.add(ui.Label('Select Year:'));
panel_2_content.add(yearSelect);
panel_2_content.add(ui.Label('📊 Statistics', {fontWeight:'bold', margin:'5px 10px'}));
panel_2_content.add(statsPanel);
panel_2_content.add(ui.Label('🗺️ Legend', {fontWeight:'bold', margin:'5px 10px'}));
panel_2_content.add(legendPanel);

accordion.add(ui.Panel([panel_2_title, panel_2_content], ui.Panel.Layout.flow('vertical'), {
  backgroundColor:'#ecf0f1', padding:'8px', border:'1px solid #bdc3c7', margin:'5px 0'
}));

// Panel 3: Change Detection
var panel_3_title = ui.Label('3. Change Detection', {fontWeight:'bold', fontSize:'16px', margin:'5px 0', color:'#34495e'});
var panel_3_content = ui.Panel();
panel_3_content.style().set('shown', false);

var changeFromSelect = ui.Select({items:yearList.map(String), value:String(yearList[0]), style:{margin:'5px 5px', stretch:'horizontal'}});
var changeToSelect   = ui.Select({items:yearList.map(String), value:String(yearList[yearList.length-1]), style:{margin:'5px 5px', stretch:'horizontal'}});
var changeButton = ui.Button('Run Change Analysis', runChangeDetection, false, {width:'90%', margin:'5px auto'});
var changeResultsPanel = ui.Panel([ui.Label('Click button to run analysis.')], null, {margin:'5px 10px'});

panel_3_content.add(ui.Label('From:'));
panel_3_content.add(changeFromSelect);
panel_3_content.add(ui.Label('To:'));
panel_3_content.add(changeToSelect);
panel_3_content.add(changeButton);
panel_3_content.add(changeResultsPanel);

accordion.add(ui.Panel([panel_3_title, panel_3_content], ui.Panel.Layout.flow('vertical'), {
  backgroundColor:'#ecf0f1', padding:'8px', border:'1px solid #bdc3c7', margin:'5px 0'
}));

// Panel 4: Trend Analysis
var panel_4_title = ui.Label('4. Trend Analysis', {fontWeight:'bold', fontSize:'16px', margin:'5px 0', color:'#34495e'});
var panel_4_content = ui.Panel();
panel_4_content.style().set('shown', false);

var chartButton = ui.Button('Generate Trend Chart', generateTrendChart, false, {width:'90%', margin:'5px auto'});
var chartPanel = ui.Panel([ui.Label('Click button to generate chart.')], null, {margin:'5px 10px'});
panel_4_content.add(chartButton);
panel_4_content.add(chartPanel);

accordion.add(ui.Panel([panel_4_title, panel_4_content], ui.Panel.Layout.flow('vertical'), {
  backgroundColor:'#ecf0f1', padding:'8px', border:'1px solid #bdc3c7', margin:'5px 0'
}));

// Panel 5: Advanced Charts
var panel_5_title = ui.Label('5. Advanced Charts', {fontWeight:'bold', fontSize:'16px', margin:'5px 0', color:'#34495e'});
var panel_5_content = ui.Panel({layout: ui.Panel.Layout.flow('vertical')});
panel_5_content.style().set('shown', false);

var chartTypeSelect = ui.Select({
  items: [
    'Stacked Area Chart',
    'Change Matrix',
    'Classification Confidence',
    'NDVI by LULC Class',
    'Net Change Bar Chart'
  ],
  value: 'Stacked Area Chart',
  style: {margin: '5px 10px', width: '95%'}
});

var chartYear1Select = ui.Select({
  items: yearList.map(String),
  value: String(yearList[0]),
  style: {margin: '5px 5px', width: '45%'}
});
chartYear1Select.style().set('shown', false);

var chartYear2Select = ui.Select({
  items: yearList.map(String),
  value: String(yearList[yearList.length-1]),
  style: {margin: '5px 5px', width: '45%'}
});
chartYear2Select.style().set('shown', false);

var chartYearSelect = ui.Select({
  items: yearList.map(String),
  value: String(yearList[0]),
  style: {margin: '5px 10px', width: '95%'}
});
chartYearSelect.style().set('shown', false);

var generateChartBtn = ui.Button('Generate Chart', generateSelectedChart, false, {
  width: '95%', 
  margin: '10px auto',
  backgroundColor: '#3498db',
  color: 'white'
});

var advancedChartPanel = ui.Panel([
  ui.Label('Select chart type and click "Generate Chart"')
], null, {margin: '10px', backgroundColor: 'white', padding: '10px'});

panel_5_content.add(ui.Label('Select Chart Type:'));
panel_5_content.add(chartTypeSelect);
panel_5_content.add(ui.Panel([chartYear1Select, chartYear2Select], 
  ui.Panel.Layout.flow('horizontal')));
panel_5_content.add(chartYearSelect);
panel_5_content.add(generateChartBtn);
panel_5_content.add(advancedChartPanel);

accordion.add(ui.Panel([panel_5_title, panel_5_content], 
  ui.Panel.Layout.flow('vertical'), {
  backgroundColor:'#ecf0f1', 
  padding:'8px', 
  border:'1px solid #bdc3c7', 
  margin:'5px 0'
}));

// Panel 6: Inspector & Export
var panel_6_title = ui.Label('6. Inspector & Export', {fontWeight:'bold', fontSize:'16px', margin:'5px 0', color:'#34495e'});
var panel_6_content = ui.Panel();
panel_6_content.style().set('shown', false);

var inspectorPanel = ui.Panel([ui.Label('Click on map for pixel info.')], null, {margin:'5px 10px'});
var exportClassSelect = ui.Select({items:names, value:'Urban Area', style:{margin:'5px 10px', stretch:'horizontal'}});
var exportVectorButton = ui.Button('Export Class as Vector (Shapefile)', exportVector, false, {width:'90%', margin:'5px auto'});
var exportImageButton  = ui.Button('Export Current LULC Image (GeoTIFF)',   exportImage,  false, {width:'90%', margin:'5px auto'});
var exportVideoButton  = ui.Button('Export Time-Lapse Video (GIF)',          exportVideo,  false, {width:'90%', margin:'5px auto'});

panel_6_content.add(ui.Label('Pixel Inspector', {fontWeight:'bold', margin:'5px 10px'}));
panel_6_content.add(inspectorPanel);
panel_6_content.add(ui.Label('Export Tools', {fontWeight:'bold', margin:'5px 10px'}));
panel_6_content.add(ui.Label('Select class to export as vector:'));
panel_6_content.add(exportClassSelect);
panel_6_content.add(exportVectorButton);
panel_6_content.add(exportImageButton);
panel_6_content.add(exportVideoButton);

accordion.add(ui.Panel([panel_6_title, panel_6_content], ui.Panel.Layout.flow('vertical'), {
  backgroundColor:'#ecf0f1', padding:'8px', border:'1px solid #bdc3c7', margin:'5px 0'
}));

// Core Functions
function trainModel() {
  modelStatus.setValue('Training... This may take a minute.');
  accuracyPanel.clear();
  trainButton.setDisabled(true);

  var sample = water.merge(cultivations).merge(vegetations).merge(Urban_area).merge(sand).merge(bare);
  sample = sample.randomColumn('random');
  appState.trainingData = sample.filter(ee.Filter.lte('random', 0.8));
  appState.testData     = sample.filter(ee.Filter.gt('random', 0.8));

  print('Total samples:', sample.size());
  print('Training samples:', appState.trainingData.size());
  print('Test samples:', appState.testData.size());

  appState.referenceImage = getImageryForYear(referenceYear);
  appState.bandNames = appState.referenceImage.bandNames();
  print('Bands for classification:', appState.bandNames);

  var trainSample = appState.referenceImage.sampleRegions({
    collection: appState.trainingData,
    scale: SCALE,
    properties: ['class'],
    tileScale: 4
  });

  var classifierType = classifierSelect.getValue();
  if (classifierType === 'SVM') {
    appState.model = ee.Classifier.libsvm({
      kernelType:'RBF', gamma:0.5, cost:10, decisionProcedure:'Voting'
    }).train({ features:trainSample, classProperty:'class', inputProperties:appState.bandNames });
  } else if (classifierType === 'CART') {
    appState.model = ee.Classifier.smileCart().train({
      features:trainSample, classProperty:'class', inputProperties:appState.bandNames
    });
  } else {
    appState.model = ee.Classifier.smileRandomForest({ numberOfTrees:100, seed:42 }).train({
      features:trainSample, classProperty:'class', inputProperties:appState.bandNames
    });
  }

  calculateAccuracy();
  generateLulcCollection();

  modelStatus.setValue('✅ Model trained (' + classifierType + ')');
  trainButton.setDisabled(false);

  panel_2_content.style().set('shown', true);
  panel_3_content.style().set('shown', true);
  panel_4_content.style().set('shown', true);
  panel_5_content.style().set('shown', true);
  panel_6_content.style().set('shown', true);

  createLegend();
  updateMap(yearSelect.getValue());
}

function calculateAccuracy() {
  accuracyPanel.clear();
  accuracyPanel.add(ui.Label('Calculating accuracy...'));

  var testSample = appState.referenceImage.sampleRegions({
    collection: appState.testData, scale: SCALE, properties:['class'], tileScale:4
  });

  var testClassified = testSample.classify(appState.model);
  var cm = testClassified.errorMatrix('class', 'classification');

  cm.accuracy().evaluate(function(acc) {
    cm.kappa().evaluate(function(kappa) {
      accuracyPanel.clear();
      accuracyPanel.add(ui.Label('Model Accuracy (on ' + referenceYear + ' data):', {fontWeight:'bold'}));
      accuracyPanel.add(ui.Label('Overall Accuracy: ' + (acc*100).toFixed(2) + '%'));
      accuracyPanel.add(ui.Label('Kappa: ' + kappa.toFixed(3)));
      var cmNames = ['Unclassified'].concat(names);
      var cmChart = ui.Chart.array.values(cm.array(), 0, cmNames)
        .setSeriesNames(cmNames)
        .setOptions({ title:'Confusion Matrix', hAxis:{title:'Predicted'}, vAxis:{title:'Actual'} });
      accuracyPanel.add(cmChart);
    });
  });
}

function generateLulcCollection() {
  modelStatus.setValue('Pre-processing all years... (this is the slow part)');

  var lulcList = yearList.map(function(year) {
    var image = getImageryForYear(year);
    var bandCount = image.bandNames().length();
    var classified = ee.Image(ee.Algorithms.If(
      bandCount.gt(0),
      image.classify(appState.model).rename('LULC').toByte(),
      ee.Image.constant(0).rename('LULC').toByte()
    ));
    return classified.set('year', year, 'system:time_start', ee.Date.fromYMD(year,1,1));
  });

  appState.lulcCollection = ee.ImageCollection(lulcList);

  appState.lulcCollection.size().evaluate(function(size) {
    print('LULC Collection generated with', size, 'images');
    if (size === 0) {
      modelStatus.setValue('❌ ERROR: No LULC images generated! Check data availability.');
      return;
    }
    modelStatus.setValue('✅ Model trained & all years processed!');
  });
}

function updateMap(year) {
  if (!appState.lulcCollection) return;

  year = parseInt(year, 10);
  statsPanel.clear();
  statsPanel.add(ui.Label('Loading ' + year + '...'));

  appState.currentLulc = appState.lulcCollection.filter(ee.Filter.eq('year', year)).first();
  appState.currentImage = getImageryForYear(year);

  while (mapPanel.layers().length() > 1) {
    mapPanel.layers().remove(mapPanel.layers().get(1));
  }

  mapPanel.addLayer(appState.currentLulc, {min:1, max:names.length, palette:palette}, 'LULC ' + year);
  calculateStats(appState.currentLulc, year);
}

function calculateStats(image, year) {
  var areaImage = ee.Image.pixelArea().divide(10000).addBands(image);
  var stats = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({groupField:1, groupName:'class'}),
    geometry: aoi, scale: SCALE, maxPixels:1e9, tileScale:4
  });

  stats.evaluate(function(result) {
    statsPanel.clear();
    statsPanel.add(ui.Label('Area by Class (Hectares)', {fontWeight:'bold'}));
    if (result && result.groups) {
      var total = 0;
      result.groups.forEach(function(g) {
        var idx = g['class'] - 1;
        var nm = names[idx];
        var ar = g.sum;
        total += ar;
        statsPanel.add(ui.Label(nm + ': ' + ar.toFixed(2) + ' ha'));
      });
      statsPanel.add(ui.Label('Total Area: ' + total.toFixed(2) + ' ha', {fontWeight:'bold', margin:'5px 0 0 0'}));
    } else {
      statsPanel.add(ui.Label('No data for ' + year));
    }
  });
}

function runChangeDetection() {
  changeResultsPanel.clear();
  changeResultsPanel.add(ui.Label('Calculating...'));
  var year1 = parseInt(changeFromSelect.getValue(), 10);
  var year2 = parseInt(changeToSelect.getValue(), 10);

  if (year1 >= year2) {
    changeResultsPanel.clear();
    changeResultsPanel.add(ui.Label('Error: "From Year" must be before "To Year".'));
    return;
  }

  var lulc1 = appState.lulcCollection.filter(ee.Filter.eq('year', year1)).first();
  var lulc2 = appState.lulcCollection.filter(ee.Filter.eq('year', year2)).first();

  var changeMap = lulc1.multiply(10).add(lulc2).rename('change');
  mapPanel.addLayer(changeMap, {min:11, max:names.length*10+names.length, palette:['ff0000','00ff00','0000ff']}, 'Change ('+year1+' to '+year2+')', false);

  var areaImage = ee.Image.pixelArea().divide(10000);
  
  var stats1 = areaImage.addBands(lulc1).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField:1, groupName:'class'}),
    geometry: aoi, scale: SCALE, maxPixels:1e9, tileScale:4
  });

  stats1.evaluate(function(s1) {
    var stats2 = areaImage.addBands(lulc2).reduceRegion({
      reducer: ee.Reducer.sum().group({groupField:1, groupName:'class'}),
      geometry: aoi, scale: SCALE, maxPixels:1e9, tileScale:4
    });
    
    stats2.evaluate(function(s2) {
      changeResultsPanel.clear();
      changeResultsPanel.add(ui.Label('Change in Hectares (' + year1 + ' to ' + year2 + '):', {fontWeight:'bold'}));
      var d1 = {}; 
      if (s1 && s1.groups) {
        s1.groups.forEach(function(g){ d1[g['class']] = g.sum; });
      }
      var d2 = {}; 
      if (s2 && s2.groups) {
        s2.groups.forEach(function(g){ d2[g['class']] = g.sum; });
      }
      names.forEach(function(nm, i){
        var val = i+1;
        var v1 = d1[val] || 0;
        var v2 = d2[val] || 0;
        var diff = v2 - v1;
        var sign = diff > 0 ? '+' : '';
        changeResultsPanel.add(ui.Label(nm + ': ' + sign + diff.toFixed(2) + ' ha'));
      });
    });
  });
}

function generateTrendChart() {
  chartPanel.clear();
  chartPanel.add(ui.Label('Generating chart... This may take a moment.'));

  if (!appState.lulcCollection) {
    chartPanel.clear();
    chartPanel.add(ui.Label('Error: Model not trained yet. Train the model first.'));
    return;
  }
  
  var yearIndex = 0;
  var allResults = {};

  function computeYearStats() {
    if (yearIndex >= yearList.length) {
      createTrendChartFromData(allResults);
      return;
    }

    var year = yearList[yearIndex];
    var yearImage = appState.lulcCollection
      .filter(ee.Filter.eq('year', year))
      .first();

    var areaImage = ee.Image.pixelArea().divide(10000);
    var statsImage = areaImage.addBands(yearImage);

    var stats = statsImage.reduceRegion({
      reducer: ee.Reducer.sum().group({
        groupField: 1,
        groupName: 'class'
      }),
      geometry: aoi,
      scale: SCALE,
      maxPixels: 1e9,
      tileScale: 4
    });

    stats.evaluate(function(result) {
      allResults[year] = result;
      yearIndex++;
      chartPanel.clear();
      chartPanel.add(ui.Label('Processing year ' + year + '... (' + yearIndex + '/' + yearList.length + ')'));
      computeYearStats();
    });
  }

  computeYearStats();
}

function createTrendChartFromData(allResults) {
  var features = [];
  
  yearList.forEach(function(year) {
    var result = allResults[year];
    if (result && result.groups) {
      result.groups.forEach(function(g) {
        var classVal = g['class'];
        var className = names[classVal - 1] || 'Unknown';
        var areaHa = g['sum'] || 0;
        
        features.push(ee.Feature(null, {
          year: year,
          class: className,
          area_ha: areaHa
        }));
      });
    }
  });

  if (features.length === 0) {
    chartPanel.clear();
    chartPanel.add(ui.Label('Error: No data available for chart generation.'));
    return;
  }

  var fc = ee.FeatureCollection(features);
  appState.trendData = fc;

  var chart = ui.Chart.feature.groups({
      features: fc,
      xProperty: 'year',
      seriesProperty: 'class',
      yProperty: 'area_ha'
    })
    .setChartType('LineChart')
    .setOptions({
      title: 'LULC Area Over Time',
      hAxis: { title: 'Year', format: '####' },
      vAxis: { title: 'Area (Hectares)', minValue: 0 },
      lineWidth: 2,
      pointSize: 5,
      interpolateNulls: false,
      series: (function () {
        var s = {};
        for (var i = 0; i < names.length; i++) {
          s[i] = { color: '#' + palette[i], labelInLegend: names[i] };
        }
        return s;
      })()
    });

  chartPanel.clear();
  chartPanel.add(chart);
}

// Advanced Chart Functions
function addStackedAreaChart() {
  if (!appState.trendData) {
    advancedChartPanel.clear();
    advancedChartPanel.add(ui.Label('Please generate trend data first from Panel 4.'));
    return null;
  }
  
  var chart = ui.Chart.feature.groups({
    features: appState.trendData,
    xProperty: 'year',
    seriesProperty: 'class',
    yProperty: 'area_ha'
  }).setChartType('AreaChart')
    .setOptions({
      title: 'LULC Composition Over Time',
      isStacked: true,
      hAxis: {title: 'Year', format: '####'},
      vAxis: {title: 'Area (Hectares)'},
      colors: palette.map(function(c) { return '#' + c; }),
      height: 300,
      width: 380
    });
  return chart;
}

function addChangeMatrixChart(year1, year2) {
  advancedChartPanel.clear();
  advancedChartPanel.add(ui.Label('Calculating change matrix... This may take a moment.'));
  
  if (!appState.lulcCollection) {
    advancedChartPanel.clear();
    advancedChartPanel.add(ui.Label('Model not trained yet. Train the model first.'));
    return;
  }
  
  var lulc1 = appState.lulcCollection.filter(ee.Filter.eq('year', year1)).first();
  var lulc2 = appState.lulcCollection.filter(ee.Filter.eq('year', year2)).first();
  var combined = lulc1.multiply(100).add(lulc2);
  
  var transitionData = [];
  var processIndex = 0;
  
  function processTransition() {
    if (processIndex >= names.length * names.length) {
      if (transitionData.length > 0) {
        createTransitionMatrixChart(transitionData, year1, year2);
      } else {
        advancedChartPanel.clear();
        advancedChartPanel.add(ui.Label('No significant transitions detected.'));
      }
      return;
    }
    
    var fromIdx = Math.floor(processIndex / names.length);
    var toIdx = processIndex % names.length;
    var fromClass = fromIdx + 1;
    var toClass = toIdx + 1;
    
    var transitionMask = combined.eq(fromClass * 100 + toClass);
    var area = transitionMask.multiply(ee.Image.pixelArea().divide(10000));
    
    var stats = area.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi,
      scale: SCALE,
      maxPixels: 1e9,
      tileScale: 4
    });
    
    stats.evaluate(function(result) {
      var areaValue = result.LULC || result.change || 0;
      if (areaValue > 0.1) {
        transitionData.push({
          from: names[fromIdx],
          to: names[toIdx],
          area: areaValue,
          fromIdx: fromIdx,
          toIdx: toIdx
        });
      }
      processIndex++;
      advancedChartPanel.clear();
      advancedChartPanel.add(ui.Label('Processing transitions... ' + processIndex + '/' + (names.length * names.length)));
      processTransition();
    });
  }
  
  processTransition();
}

function createTransitionMatrixChart(transitionData, year1, year2) {
  if (transitionData.length === 0) {
    advancedChartPanel.clear();
    advancedChartPanel.add(ui.Label('No significant transitions detected between ' + year1 + ' and ' + year2));
    return;
  }
  
  // Sort by area (descending) to show top transitions
  var sortedData = transitionData.sort(function(a, b) { return b.area - a.area; });
  
  // Create display label for transitions
  advancedChartPanel.clear();
  advancedChartPanel.add(ui.Label('Top 20 Land Use Transitions: ' + year1 + ' → ' + year2, {fontWeight: 'bold', margin: '5px 0'}));
  
  var statsPanel = ui.Panel(null, null, {margin: '5px 0'});
  var topTransitions = sortedData.slice(0, 20);
  
  topTransitions.forEach(function(t) {
    statsPanel.add(ui.Label(
      t.from + ' → ' + t.to + ': ' + t.area.toFixed(2) + ' ha',
      {margin: '3px 5px', fontSize: '12px', color: '#2c3e50'}
    ));
  });
  
  advancedChartPanel.add(statsPanel);
  
  // Create summary statistics
  var totalTransition = 0;
  transitionData.forEach(function(t) {
    totalTransition += t.area;
  });
  
  advancedChartPanel.add(ui.Label('Total Transition Area: ' + totalTransition.toFixed(2) + ' ha', {fontWeight:'bold', margin:'10px 5px 5px 5px'}));
}

function addConfidenceChart(year) {
  advancedChartPanel.clear();
  advancedChartPanel.add(ui.Label('Calculating confidence... This may take a moment.'));
  
  if (!appState.model) {
    advancedChartPanel.clear();
    advancedChartPanel.add(ui.Label('Model not trained yet. Train the model first.'));
    return;
  }
  
  var image = getImageryForYear(year);
  var classified = image.classify(appState.model);
  
  var chart = ui.Chart.image.histogram({
    image: classified,
    region: aoi,
    scale: SCALE,
    maxBuckets: names.length
  }).setOptions({
    title: 'Classification Distribution - ' + year,
    hAxis: {title: 'Class (1-' + names.length + ')',
            ticks: names.map(function(n, i) { return {v: i+1, f: n.substr(0, 3)}; })},
    vAxis: {title: 'Pixel Count'},
    colors: palette.map(function(c) { return '#' + c; }),
    height: 300,
    width: 380,
    legend: {position: 'none'}
  });
  
  advancedChartPanel.clear();
  advancedChartPanel.add(chart);
}

function addNDVIvsLULCChart(year) {
  advancedChartPanel.clear();
  advancedChartPanel.add(ui.Label('Calculating NDVI stats... This may take a moment.'));
  
  if (!appState.lulcCollection) {
    advancedChartPanel.clear();
    advancedChartPanel.add(ui.Label('Model not trained yet. Train the model first.'));
    return;
  }
  
  var lulc = appState.lulcCollection.filter(ee.Filter.eq('year', year)).first();
  var image = getImageryForYear(year);
  var ndvi = image.select('NDVI');
  
  var samplePoints = ee.FeatureCollection.randomPoints({
    region: aoi,
    points: 500,
    seed: 42
  });
  
  var samples = ndvi.addBands(lulc).sampleRegions({
    collection: samplePoints,
    scale: SCALE,
    geometries: false
  });
  
  var chart = ui.Chart.feature.groups({
    features: samples,
    xProperty: 'LULC',
    yProperty: 'NDVI',
    seriesProperty: 'LULC'
  }).setChartType('ScatterChart')
    .setOptions({
      title: 'NDVI Distribution by LULC Class - ' + year,
      hAxis: {title: 'LULC Class', 
              ticks: names.map(function(n, i) { return {v: i+1, f: n.substr(0, 3)}; })},
      vAxis: {title: 'NDVI Value', viewWindow: {min: -1, max: 1}},
      colors: palette.map(function(c) { return '#' + c; }),
      pointSize: 3,
      dataOpacity: 0.6,
      height: 300,
      width: 380
    });
  
  advancedChartPanel.clear();
  advancedChartPanel.add(chart);
}

function addChangeBarChart(year1, year2) {
  advancedChartPanel.clear();
  advancedChartPanel.add(ui.Label('Calculating changes... This may take a moment.'));
  
  if (!appState.lulcCollection) {
    advancedChartPanel.clear();
    advancedChartPanel.add(ui.Label('Model not trained yet. Train the model first.'));
    return;
  }
  
  var lulc1 = appState.lulcCollection.filter(ee.Filter.eq('year', year1)).first();
  var lulc2 = appState.lulcCollection.filter(ee.Filter.eq('year', year2)).first();
  
  var areaImage = ee.Image.pixelArea().divide(10000);
  
  var stats1 = areaImage.addBands(lulc1).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField:1, groupName:'class'}),
    geometry: aoi, scale: SCALE, maxPixels:1e9, tileScale:4
  });
  
  var stats2 = areaImage.addBands(lulc2).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField:1, groupName:'class'}),
    geometry: aoi, scale: SCALE, maxPixels:1e9, tileScale:4
  });
  
  stats1.evaluate(function(s1) {
    stats2.evaluate(function(s2) {
      var d1 = {}; 
      if (s1 && s1.groups) {
        s1.groups.forEach(function(g){ d1[g['class']] = g.sum; });
      }
      var d2 = {}; 
      if (s2 && s2.groups) {
        s2.groups.forEach(function(g){ d2[g['class']] = g.sum; });
      }
      
      // Display change statistics as text
      advancedChartPanel.clear();
      advancedChartPanel.add(ui.Label('Area Changes: ' + year1 + ' to ' + year2, {fontWeight: 'bold', margin: '5px 0'}));
      
      var statsDisplay = ui.Panel(null, null, {margin: '5px 0'});
      var hasChange = false;
      
      names.forEach(function(nm, i){
        var val = i+1;
        var v1 = d1[val] || 0;
        var v2 = d2[val] || 0;
        var diff = v2 - v1;
        var sign = diff > 0 ? '+' : '';
        
        statsDisplay.add(ui.Label(
          nm + ': ' + sign + diff.toFixed(2) + ' ha',
          {margin: '3px 5px', fontSize: '12px', color: diff > 0 ? '#27ae60' : '#c0152f'}
        ));
        if (Math.abs(diff) > 0.1) hasChange = true;
      });
      
      advancedChartPanel.add(statsDisplay);
      
      // Create visualization using groups chart
      if (hasChange) {
        var chartData = [];
        names.forEach(function(nm, i){
          var val = i+1;
          var v1 = d1[val] || 0;
          var v2 = d2[val] || 0;
          var diff = v2 - v1;
          
          chartData.push(ee.Feature(null, {
            lulcClass: nm,
            change_area: Math.abs(diff),
            change_type: diff > 0 ? 'Increase' : 'Decrease'
          }));
        });
        
        var chartFC = ee.FeatureCollection(chartData);
        
        try {
          var changeChart = ui.Chart.feature.groups({
            features: chartFC,
            xProperty: 'lulcClass',
            yProperty: 'change_area',
            seriesProperty: 'change_type'
          }).setChartType('ColumnChart')
            .setOptions({
              title: 'Net Change by Class',
              hAxis: {title: 'LULC Class', slantedText: true, slantedTextAngle: 45},
              vAxis: {title: 'Area Change (ha)'},
              colors: ['#27ae60', '#c0152f'],
              height: 300,
              width: 380,
              bar: {groupWidth: '75%'}
            });
          
          advancedChartPanel.add(changeChart);
        } catch(e) {
          print('Chart generation error (non-critical):', e);
        }
      }
    });
  });
}

function generateSelectedChart() {
  var chartTypeValue = chartTypeSelect.getValue();
  var chartTypeStr = String(chartTypeValue || '');
  
  if (chartTypeStr.indexOf('Stacked Area') !== -1) {
    var chart = addStackedAreaChart();
    if (chart) {
      advancedChartPanel.clear();
      advancedChartPanel.add(chart);
    }
  } else if (chartTypeStr.indexOf('Change Matrix') !== -1) {
    var y1 = parseInt(chartYear1Select.getValue(), 10);
    var y2 = parseInt(chartYear2Select.getValue(), 10);
    if (y1 >= y2) {
      advancedChartPanel.clear();
      advancedChartPanel.add(ui.Label('Error: Year 1 must be before Year 2'));
      return;
    }
    addChangeMatrixChart(y1, y2);
  } else if (chartTypeStr.indexOf('Classification Confidence') !== -1) {
    var year = parseInt(chartYearSelect.getValue(), 10);
    addConfidenceChart(year);
  } else if (chartTypeStr.indexOf('NDVI') !== -1) {
    var year = parseInt(chartYearSelect.getValue(), 10);
    addNDVIvsLULCChart(year);
  } else if (chartTypeStr.indexOf('Net Change') !== -1) {
    var y1 = parseInt(chartYear1Select.getValue(), 10);
    var y2 = parseInt(chartYear2Select.getValue(), 10);
    if (y1 >= y2) {
      advancedChartPanel.clear();
      advancedChartPanel.add(ui.Label('Error: Year 1 must be before Year 2'));
      return;
    }
    addChangeBarChart(y1, y2);
  }
}

chartTypeSelect.onChange(function(value) {
  var valueStr = String(value || '');
  
  var needsTwoYears = valueStr.indexOf('Change Matrix') !== -1 || valueStr.indexOf('Net Change') !== -1;
  var needsOneYear = valueStr.indexOf('Classification Confidence') !== -1 || valueStr.indexOf('NDVI') !== -1;
  
  chartYear1Select.style().set('shown', needsTwoYears);
  chartYear2Select.style().set('shown', needsTwoYears);
  chartYearSelect.style().set('shown', needsOneYear);
});

// Inspector and Export Functions
function inspectMap(coords) {
  if (!appState.currentLulc || !appState.currentImage) return;

  inspectorPanel.clear();
  inspectorPanel.add(ui.Label('Inspecting...'));

  var point = ee.Geometry.Point(coords.lon, coords.lat);
  var region = point.buffer(SCALE).bounds();

  var lulcVal = appState.currentLulc.reduceRegion({
    reducer: ee.Reducer.mode(),
    geometry: region,
    scale: SCALE,
    maxPixels: 1e9,
    tileScale: 4,
    bestEffort: true
  }).get('LULC');

  lulcVal.evaluate(function(lulc) {
    var indicesDict = appState.currentImage
      .unmask()
      .select(['NDVI', 'NDBI', 'MNDWI', 'EVI', 'BSI', 'UI'])
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: SCALE,
        maxPixels: 1e9,
        tileScale: 4,
        bestEffort: true
      });

    indicesDict.evaluate(function(idx) {
      inspectorPanel.clear();

      if (lulc === null || lulc === undefined) {
        inspectorPanel.add(ui.Label('No data at this location (outside AOI or fully masked).'));
        return;
      }

      var className = names[lulc - 1] || 'Unknown';
      inspectorPanel.add(ui.Label('Class: ' + className + ' (' + lulc + ')', {fontWeight: 'bold'}));

      idx = idx || {};
      var ndvi = (idx.NDVI  !== null && idx.NDVI  !== undefined) ? Number(idx.NDVI ).toFixed(3) : 'N/A';
      var ndbi = (idx.NDBI  !== null && idx.NDBI  !== undefined) ? Number(idx.NDBI ).toFixed(3) : 'N/A';
      var mndwi = (idx.MNDWI !== null && idx.MNDWI !== undefined) ? Number(idx.MNDWI).toFixed(3) : 'N/A';
      var evi  = (idx.EVI   !== null && idx.EVI   !== undefined) ? Number(idx.EVI  ).toFixed(3) : 'N/A';
      var bsi  = (idx.BSI   !== null && idx.BSI   !== undefined) ? Number(idx.BSI  ).toFixed(3) : 'N/A';
      var uiV  = (idx.UI    !== null && idx.UI    !== undefined) ? Number(idx.UI   ).toFixed(3) : 'N/A';

      inspectorPanel.add(ui.Label('NDVI: ' + ndvi));
      inspectorPanel.add(ui.Label('NDBI: ' + ndbi));
      inspectorPanel.add(ui.Label('MNDWI: ' + mndwi));
      inspectorPanel.add(ui.Label('EVI: ' + evi));
      inspectorPanel.add(ui.Label('BSI: ' + bsi));
      inspectorPanel.add(ui.Label('UI: ' + uiV));
    });
  });
}

mapPanel.onClick(inspectMap);

function exportVector() {
  var className = exportClassSelect.getValue();
  var classVal = names.indexOf(className) + 1;
  var year = yearSelect.getValue();

  var imageToExport = appState.currentLulc.eq(classVal).selfMask();
  var vectors = imageToExport.reduceToVectors({
    geometry: aoi, scale: SCALE, crs:'EPSG:4326', maxPixels:1e10
  });

  Export.table.toDrive({
    collection: vectors,
    description: 'LULC_Vector_' + className.replace(' ','_') + '_' + year,
    fileFormat: 'SHP'
  });
  print('✅ Export task created for ' + className + ' vectors in ' + year);
}

function exportImage() {
  var year = yearSelect.getValue();
  Export.image.toDrive({
    image: appState.currentLulc,
    description: 'LULC_Raster_' + year,
    folder: 'LULC_TimeSeries',
    scale: SCALE, region: aoi, crs:'EPSG:4326', maxPixels:1e10
  });
  print('✅ Export task created for ' + year + ' LULC raster');
}

function exportVideo() {
  var rgbCollection = appState.lulcCollection.map(function(image){
    return image.visualize({min:1, max:names.length, palette:palette});
  });
  Export.video.toDrive({
    collection: rgbCollection,
    description: 'LULC_TimeSeries_Animation',
    framesPerSecond: 1, region: aoi, scale: SCALE, maxPixels: 1e10
  });
  print('✅ Export task created for time-lapse video');
}

function createLegend() {
  legendPanel.clear();
  names.forEach(function(name, i){
    var colorBox = ui.Label({ style:{ backgroundColor:'#'+palette[i], padding:'8px', margin:'0 8px 4px 0', border:'1px solid #ccc' }});
    var description = ui.Label(name, {margin:'0 0 4px 0', fontSize:'13px'});
    legendPanel.add(ui.Panel([colorBox, description], ui.Panel.Layout.flow('horizontal')));
  });
}

// Instructions
print('🚀 Multi-Temporal LULC App Initialized!');
print('📝 Instructions:');
print('1) Import your training data (aoi, water, cultivations, vegetations, urban, sand, bare).');
print('2) Click "Train Model" in Panel 1.');
print('3) After training, explore different years.');
print('4) Use export tools to download results.');
print('5) Check Panel 5 for advanced charts!');

var instructions = ui.Panel([
  ui.Label('📋 GETTING STARTED', {fontWeight:'bold', fontSize:'16px', margin:'10px 0'}),
  ui.Label('1. Import your training data first'),
  ui.Label('2. Click "Train Model" in Panel 1'),
  ui.Label('3. Wait for processing to complete'),
  ui.Label('4. Explore results in other panels'),
  ui.Label('5. Check Panel 5 for advanced charts')
], ui.Panel.Layout.flow('vertical'), {
  backgroundColor:'#e8f4fd', padding:'10px', border:'1px solid #3498db', margin:'10px 5px'
});
mainPanel.insert(1, instructions);
