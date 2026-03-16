<div align="center">

# 🌍 Multi-Temporal LULC App

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=30&duration=3000&pause=1000&color=00FF41&center=true&vCenter=true&width=1000&lines=Multi-Temporal+LULC+App;Google+Earth+Engine+%7C+CA-Markov+Forecasting;Land+Cover+Mapping+%7C+1995+%E2%86%92+2050;By%20Prithwiraj%20Das" />

<br>

<br/>


<br/>

<img src="https://img.shields.io/badge/📅%20Historical-1995%20→%202025-00897B?style=flat-square&labelColor=0a2e1a" />
<img src="https://img.shields.io/badge/🔮%20Future-2030%20·%202040%20·%202050-6A1B9A?style=flat-square&labelColor=1a0a2e" />
<img src="https://img.shields.io/badge/📐%20Resolution-30m%20Spatial-455A64?style=flat-square" />
<img src="https://img.shields.io/badge/🗂%20Classes-6%20LULC-5D4037?style=flat-square" />

<br/>

<img src="https://img.shields.io/badge/🛰%20Sensors-Landsat%205%2F7%2F8%20+%20Sentinel--2-1976D2?style=flat-square&labelColor=0d1f3c" />
<img src="https://img.shields.io/badge/📊%20Indices-NDVI%20·%20EVI%20·%20NDBI%20·%20MNDWI%20·%20BSI%20·%20UI-00695C?style=flat-square" />
<img src="https://img.shields.io/badge/✓%20Accuracy-OA%20+%20Kappa%20+%20Confusion%20Matrix-1565C0?style=flat-square" />

<br/>

<img src="https://img.shields.io/badge/💾%20Export-SHP%20·%20GeoTIFF%20·%20MP4-F9A825?style=flat-square" />
<img src="https://img.shields.io/badge/🔄%20CA--Markov-Transition%20·%20Suitability%20·%20Projection-7B1FA2?style=flat-square" />
<img src="https://img.shields.io/badge/📉%20Change-Detection%20+%20Trend%20Charts-C62828?style=flat-square" />

<br/>

<img src="https://img.shields.io/badge/Status-Research%20Ready-1B5E20?style=flat-square" />
<img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" />

</div>

---

## 📋 Table of Contents

| # | Section |
|---|---------|
| 1 | [Overview](#-overview) |
| 2 | [Project Highlights](#-project-highlights) |
| 3 | [Workflow At A Glance](#-workflow-at-a-glance) |
| 4 | [Land Cover Schema](#-land-cover-schema) |
| 5 | [Project Structure](#-project-structure) |
| 6 | [Requirements](#-requirements) |
| 7 | [Prepare Your Input Data](#-prepare-your-input-data) |
| 8 | [How To Run](#-how-to-run) |
| 9 | [Panels And Features](#-panels-and-features) |
| 10 | [Future Prediction — CA-Markov](#-future-prediction--ca-markov) |
| 11 | [Exports](#-exports) |
| 12 | [Methodology Summary](#-methodology-summary) |
| 13 | [Limitations And Notes](#-limitations-and-notes) |
| 14 | [Citation Template](#-citation-template) |
| 15 | [License](#-license) |

---

## 🌍 Overview

This project builds a complete **multi-temporal LULC analysis system** in Google Earth Engine with an interactive UI. It supports supervised classification, temporal comparison, trend visualization, and future LULC simulation.

The implementation is designed to follow an **ERDAS IMAGINE-style** analytical flow while running fully in Earth Engine — from cloud-masked composites all the way through to CA-Markov projections.

---

## ✨ Project Highlights

- 🛰 **Multi-sensor preprocessing pipeline** — Landsat 5/7/8 and Sentinel-2
- 📊 **Feature engineering** — NDVI, EVI, NDBI, MNDWI, BSI, and UI spectral indices
- 🤖 **Supervised classifiers** — Random Forest, SVM, and CART
- ✅ **Integrated accuracy assessment** — Overall Accuracy, Kappa, and confusion matrix
- 📅 **Time-series LULC mapping** — 1995 to 2025
- 📉 **Change detection** — class-wise area delta reporting
- 📈 **Trend and advanced charting suite** — stacked area, transitions, NDVI by class, net change bars
- 🔮 **Future LULC projection** — 2030, 2040, and 2050 using CA-Markov logic
- 💾 **Export options** — Vector (SHP), Raster (GeoTIFF), and Animation (MP4)

---

## 🔄 Workflow At A Glance

```
Satellite Collection ──► Cloud / Quality Masking ──► Spectral Harmonization
        │
        ▼
Index Generation (NDVI · EVI · NDBI · MNDWI · BSI · UI)
        │
        ▼
Model Training (RF / SVM / CART) ──► Historical LULC Mapping ──► Accuracy Assessment
        │
        ▼
Change & Trend Analysis ──► CA-Markov Projection (2030 · 2040 · 2050)
        │
        ▼
Export & Reporting (SHP · GeoTIFF · MP4)
```

---

## 🗺 Land Cover Schema

<div align="center">

| Class ID | Class Name | Color Swatch | Hex Code |
|:--------:|------------|:------------:|----------|
| **1** | 🟢 Vegetation | ![#0db21f](https://img.shields.io/badge/▓▓▓▓▓▓-0db21f?style=flat-square&color=0db21f&label=) | `#0db21f` |
| **2** | 🩵 Water | ![#1cece0](https://img.shields.io/badge/▓▓▓▓▓▓-1cece0?style=flat-square&color=1cece0&label=) | `#1cece0` |
| **3** | 🔴 Urban Area | ![#ff0000](https://img.shields.io/badge/▓▓▓▓▓▓-ff0000?style=flat-square&color=ff0000&label=) | `#ff0000` |
| **4** | 🟩 Cultivation | ![#00ff00](https://img.shields.io/badge/▓▓▓▓▓▓-00ff00?style=flat-square&color=00ff00&label=) | `#00ff00` |
| **5** | 🟡 Sand | ![#f0f015](https://img.shields.io/badge/▓▓▓▓▓▓-f0f015?style=flat-square&color=f0f015&label=) | `#f0f015` |
| **6** | 🟫 Bare Land | ![#979a5d](https://img.shields.io/badge/▓▓▓▓▓▓-979a5d?style=flat-square&color=979a5d&label=) | `#979a5d` |

</div>

---

## 📁 Project Structure

```
GEE project/
├── Lulc.js        # Main 
└── README.md     # This file
```

---

## ✅ Requirements

> Before running, make sure all of the following are in place:

- ☑ Google Earth Engine account
- ☑ Earth Engine Code Editor access
- ☑ Imported training assets with correct class labels
- ☑ AOI geometry available in the script context
- ☑ Sample FeatureCollections per class available in the script context

---

## 🗃 Prepare Your Input Data

Before pressing **Train Model**, import these objects in the Code Editor left panel:

```js
// Required imports — each must include a numeric `class` property (1–6)
aoi           // Study area polygon
water         // Training samples – Water       (class: 2)
cultivations  // Training samples – Cultivation (class: 4)
vegetations   // Training samples – Vegetation  (class: 1)
Urban_area    // Training samples – Urban Area  (class: 3)
sand          // Training samples – Sand        (class: 5)
bare          // Training samples – Bare Land   (class: 6)
```

> **Note:** Each training collection must include a numeric `class` property matching the Land Cover Schema IDs above.

---

## 🚀 How To Run

**Step 1** — Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com)

**Step 2** — Paste content from `LULC.js`

**Step 3** — Import your AOI and all class training assets in the **left panel**

**Step 4** — Click **Run** to initialize the application

**Step 5** — In **Panel 1**, choose your classifier (RF / SVM / CART) and click **Train Model**

**Step 6** — After processing, use **Panels 2–7** for analysis, prediction, and export

---

## 🖥 Panels And Features

<div align="center">

| Panel | Title | Purpose |
|:-----:|-------|---------|
| **1** | 🔧 Configure & Train Model | Select classifier (RF/SVM/CART), train model, review OA / Kappa / confusion matrix |
| **2** | 📅 Time-Series Explorer | View yearly LULC maps and class-wise area statistics (1995–2025) |
| **3** | 📉 Change Detection | Compare two years; inspect per-class area gain / loss |
| **4** | 📈 Trend Analysis | Generate LULC area-over-time line chart for all classes |
| **5** | 📊 Advanced Charts | Stacked area, transition summaries, class distributions, NDVI by class, net change bars |
| **6** | 🔮 Future Prediction | Projected maps for 2030 / 2040 / 2050 using CA-Markov simulation with back-test validation |
| **7** | 🔍 Inspector & Export | Pixel-level inspection; export to SHP, GeoTIFF, and time-lapse MP4 video |

</div>

---

## 🔮 Future Prediction — CA-Markov

The future module combines historical transition behavior with spectral suitability and neighborhood context.

### ▶ Core Steps

| Step | Action |
|------|--------|
| **1** | Build transition matrices from `2015 → 2020` and `2020 → 2025` |
| **2** | Blend matrices with weighted emphasis on recent behavior |
| **3** | Construct class-wise suitability maps from 2025 spectral indices |
| **4** | Run iterative one-step projection → produce **2030**, **2040**, and **2050** maps |
| **5** | Apply focal smoothing to reduce isolated pixel artifacts |

### ✓ Back-Test Validation

- Predicts **2025** from **2020** as a one-step back-test
- Computes error matrix, Overall Accuracy, and Kappa coefficient
- Displays validation sample size in the prediction panel

---

## 💾 Exports

| Type | Format | Description |
|------|--------|-------------|
| 🗺 **Vector** | `.SHP` | Class mask exported as Shapefile |
| 🖼 **Raster** | `.GeoTIFF` | Current LULC map at 30m resolution |
| 🎬 **Video** | `.MP4` | Time-series map animation (Google Drive task) |

---

## 📖 Methodology Summary

> This project implements a supervised multi-temporal LULC workflow in Google Earth Engine, integrating cloud-masked optical composites, spectral index engineering, and RF/SVM/CART classification with confusion-matrix-based validation. Historical transition probabilities and suitability factors are then used in a **CA-Markov style model** to simulate future LULC scenarios for **2030**, **2040**, and **2050**.

---

## ⚠ Limitations And Notes

> [!WARNING]
> **Forecast outputs** are scenario projections, not deterministic predictions.

> [!CAUTION]
> **Result quality** is sensitive to training sample quality and class balance.

> [!NOTE]
> **Transition behavior** may change if future policy or environmental conditions shift significantly.

> [!NOTE]
> **Cloud-prone regions** can reduce annual composite quality in some years.

---

## 📝 Citation Template

```bibtex
Author(s). (Year). Multi-Temporal LULC App: Google Earth Engine workflow
for historical land-cover mapping and CA-Markov-based future simulation.
```

---

## 📄 License

This project is distributed under the **MIT License**.  
You can update this section if you use a different license.

---

<div align="center">

<img src="https://img.shields.io/badge/Built%20for-Reproducible%20Geospatial%20Analysis-1B5E20?style=for-the-badge&labelColor=0a2e1a" />

<br/><br/>

**Built for reproducible geospatial analysis and decision-support planning.**
**BY Prithwiraj Das**
</div>
