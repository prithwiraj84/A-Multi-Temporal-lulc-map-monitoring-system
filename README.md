# 🌍 Multi-Temporal Land Use / Land Cover (LULC) Classification App

A **powerful, interactive Google Earth Engine (GEE) application** for **multi-temporal Land Use / Land Cover (LULC) analysis**, combining **machine learning, satellite imagery, change detection, and advanced visual analytics** in a single unified interface.

This project enables users to **train custom classifiers**, analyze **long-term land dynamics**, perform **change detection**, generate **trend & advanced charts**, inspect **pixel-level indices**, and **export results** — all directly inside the Earth Engine Code Editor.

---

## ✨ Key Features

### 🧠 Machine Learning–Based Classification

* Supports **Random Forest**, **SVM**, and **CART** classifiers
* Trains on **user-provided ground truth samples**
* Uses **multi-sensor data fusion** (Landsat 5, 7, 8 & Sentinel‑2)
* Automatically computes spectral indices:

  * NDVI, EVI, NDBI, MNDWI, BSI, UI

### ⏳ Multi‑Temporal Analysis

* Classifies LULC across multiple years (1995–2025)
* Generates consistent, comparable LULC maps for each year
* Handles data gaps and cloud masking automatically

### 🔄 Change Detection

* Quantifies **class-wise area change** between any two years
* Identifies **major land-use transitions**
* Computes net gain/loss (in hectares)

### 📈 Advanced Visual Analytics

* Time‑series trend charts (LULC area vs year)
* Stacked area charts for land composition
* Change matrices (top transitions)
* NDVI distribution by LULC class
* Classification confidence & net change charts

### 🗺️ Interactive Map Tools

* Pixel-level **LULC + spectral index inspector**
* Dynamic legends and statistics panel
* Click‑based spatial exploration

### 📤 Export Capabilities

* Export LULC rasters (GeoTIFF)
* Export individual classes as **Shapefiles**
* Generate **time‑lapse animation videos (GIF/MP4)**

---

## 🛰️ Data Sources

| Sensor           | Usage Period   |
| ---------------- | -------------- |
| Landsat 5 (TM)   | 1995 – 2011    |
| Landsat 7 (ETM+) | 1999 – 2013    |
| Landsat 8 (OLI)  | 2013 – Present |
| Sentinel‑2 (SR)  | 2017 – Present |

All imagery is **surface reflectance**, cloud‑masked, scaled, and harmonized.

---

## 🧪 Spectral Indices Used

* **NDVI** – Vegetation health
* **EVI** – Enhanced vegetation signal
* **NDBI** – Built‑up detection
* **MNDWI** – Water bodies
* **BSI** – Bare soil
* **UI** – Urban intensity

These indices significantly improve class separability.

---

## 🧩 LULC Classes

| Class Value | Class Name  |
| ----------- | ----------- |
| 1           | Vegetation  |
| 2           | Water       |
| 3           | Urban Area  |
| 4           | Cultivation |
| 5           | Sand        |
| 6           | Bare Land   |

---

## 🚀 How to Use

### 1️⃣ Import Required Assets

Import the following FeatureCollections into GEE:

* `aoi`
* `water`
* `cultivations`
* `vegetations`
* `Urban_area`
* `sand`
* `bare`

Each training dataset must contain a `class` property.

### 2️⃣ Run the Script

* Paste the full script into **Google Earth Engine Code Editor**
* Click **Run**

### 3️⃣ Train the Model

* Open **Panel 1**
* Select classifier
* Click **Train Model**

### 4️⃣ Explore Results

* View classified maps by year
* Analyze statistics, trends & changes
* Inspect pixel‑level indices

### 5️⃣ Export Outputs

* Download rasters, vectors, or animations via **Panel 6**

---

## 🖥️ Application Structure

* **Panel 1** – Model configuration & training
* **Panel 2** – Year-wise LULC explorer
* **Panel 3** – Change detection
* **Panel 4** – Trend analysis
* **Panel 5** – Advanced charts
* **Panel 6** – Inspector & export tools

---

## 📊 Accuracy Assessment

* Automatic **train/test split (80/20)**
* Confusion matrix visualization
* Overall accuracy & Kappa coefficient

Ensures reliable and interpretable classification results.

---

## ⚙️ Technical Highlights

* Cloud masking (QA_PIXEL, QA60)
* Sensor‑independent band harmonization
* Tile‑scaled reducers for large AOIs
* Robust handling of missing imagery

---

## 🧑‍💻 Ideal For

* Remote sensing research
* Urban growth analysis
* Environmental monitoring
* Academic projects & theses
* Government & planning studies

---

## 📌 Future Enhancements

* Deep learning classifiers
* Accuracy per class visualization
* Time‑aware change trajectory analysis
* Web deployment (GEE Apps / App Engine)

---

## 📜 License

This project is released for **academic and research use**. Feel free to modify and extend with proper attribution.

---

### ⭐ If you find this project useful, consider starring or citing it in your research!
