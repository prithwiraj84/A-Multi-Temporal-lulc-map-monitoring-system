# 🌍 Multi-Temporal LULC Classification & Change Analysis App (Google Earth Engine)

A complete **Google Earth Engine (GEE) interactive application** for **multi-temporal Land Use / Land Cover (LULC)** mapping, change detection, trend analysis, pixel inspection, and exporting results using **machine learning classifiers**.

---

## ✨ Features

* Multi-year LULC classification (1995–2025)
* Supports **Landsat 5, 7, 8** and **Sentinel-2**
* Cloud masking & surface reflectance processing
* Spectral indices generation:

  * NDVI
  * EVI
  * NDBI
  * MNDWI
  * BSI
  * UI
* Machine Learning Classifiers:

  * Random Forest
  * Support Vector Machine (SVM)
  * CART
* Accuracy assessment:

  * Confusion Matrix
  * Overall Accuracy
  * Kappa Coefficient
* Interactive UI Panels
* LULC export (Raster, Vector & Video)

---

## 🧭 LULC Classes

| Class ID | Class Name  |
| -------- | ----------- |
| 1        | Vegetation  |
| 2        | Water       |
| 3        | Urban Area  |
| 4        | Cultivation |
| 5        | Sand        |
| 6        | Bare Land   |

---

## 🎨 Color Palette

```js
['0db21f', '1cece0', 'ff0000', '00ff00', 'f0f015', '979a5d']
```

---

## 📅 Temporal Coverage

```text
1995, 2000, 2005, 2010, 2015, 2020, 2023, 2025
```

* Seasonal composite: **October – March**

---

## 🛰 Data Sources

* Landsat 5 TM – `LANDSAT/LT05/C02/T1_L2`
* Landsat 7 ETM+ – `LANDSAT/LE07/C02/T1_L2`
* Landsat 8 OLI – `LANDSAT/LC08/C02/T1_L2`
* Sentinel‑2 MSI – `COPERNICUS/S2_SR_HARMONIZED`

---

## 🧠 Classification Workflow

1. Import training datasets
2. Select classifier
3. Train model using reference year (2023)
4. Apply trained model to all years
5. Generate LULC maps
6. Perform statistics, trend & change analysis

---

## 🖥 Application Panels

### 1. Configure & Train Model

* Select ML classifier
* Train model
* View accuracy metrics

### 2. Time‑Series Explorer

* Select year
* Display LULC map
* Area statistics (hectares)

### 3. Change Detection

* Compare two years
* Area difference report
* Change map visualization

### 4. Trend Analysis

* Area trend chart (Year vs Area)
* Class‑wise temporal trends

### 5. Inspector & Export

* Pixel‑level inspection
* Export tools

---

## 📤 Export Options

| Export Type  | Format          |
| ------------ | --------------- |
| LULC Raster  | GeoTIFF         |
| Class Vector | Shapefile       |
| Time Series  | Video (MP4/GIF) |

Exports are saved to **Google Drive**.

---

## 📥 Required User Imports

Before running the script, import the following assets:

```text
aoi
water
cultivations
vegetations
Urban_area
sand
bare
```

Each training dataset must include:

```text
class (integer)
```

---

## ▶ How to Run

1. Open **Google Earth Engine Code Editor**
2. Paste the script
3. Import all required assets
4. Click **Run**
5. Press **Train Model**
6. Explore results & export data

---

## 📊 Outputs

* LULC classified maps
* Area statistics (ha)
* Change detection report
* Time‑series trend chart
* Exportable GIS files

---

## ⚠ Notes

* First execution may take several minutes
* Trend analysis is processed year‑wise
* Large AOIs may require higher tileScale

---

## 👨‍💻 Author

**Prithwiraj Das**
B.Tech CSE Student
Remote Sensing & Geospatial Analysis (GEE)

---

## 📜 License

This project is intended for **academic, educational, and research purposes**.

---

## 🙏 Acknowledgements

* Google Earth Engine Team
* USGS Landsat Program
* Copernicus Sentinel‑2 Mission

---

✅ *Ready for academic projects, research work, and geospatial analysis.*
