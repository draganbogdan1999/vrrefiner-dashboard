let countries = JSON.parse(localStorage.getItem("vrrefinerCountriesMap")) || [];

let profitableStationsChart = null;
let averageLitersChart = null;

let worldMap = null;
let geoJsonLayer = null;
let selectedIso3 = null;
let selectedCountryName = null;

const MILLION = 1000000;

const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const iso3Input = document.getElementById("iso3");
const countryInput = document.getElementById("country");
const stationsInput = document.getElementById("stations");
const annualLitersInput = document.getElementById("annualLiters");
const sellingPriceInput = document.getElementById("sellingPrice");
const recoveryRateInput = document.getElementById("recoveryRate");

const sigmaConservativeInput = document.getElementById("sigmaConservative");
const sigmaBaseInput = document.getElementById("sigmaBase");
const sigmaOptimisticInput = document.getElementById("sigmaOptimistic");

const globalMachineCostInput = document.getElementById("globalMachineCost");
const globalMachineCostSlider = document.getElementById("globalMachineCostSlider");
const globalMachineCostLabel = document.getElementById("globalMachineCostLabel");

const globalInstallationCostInput = document.getElementById("globalInstallationCost");
const globalInstallationCostSlider = document.getElementById("globalInstallationCostSlider");
const globalInstallationCostLabel = document.getElementById("globalInstallationCostLabel");

const globalMaintenanceCostInput = document.getElementById("globalMaintenanceCost");
const globalMaintenanceCostSlider = document.getElementById("globalMaintenanceCostSlider");
const globalMaintenanceCostLabel = document.getElementById("globalMaintenanceCostLabel");

const globalNetPricePercentInput = document.getElementById("globalNetPricePercent");
const globalNetPricePercentSlider = document.getElementById("globalNetPricePercentSlider");
const globalNetPricePercentLabel = document.getElementById("globalNetPricePercentLabel");

const globalPaybackInput = document.getElementById("globalPaybackYears");
const globalPaybackSlider = document.getElementById("globalPaybackSlider");
const globalPaybackLabel = document.getElementById("globalPaybackLabel");

const sortByInput = document.getElementById("sortBy");

const addCountryBtn = document.getElementById("addCountryBtn");
const clearFormBtn = document.getElementById("clearFormBtn");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const exportBtn = document.getElementById("exportBtn");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataInput = document.getElementById("importDataInput");

const countryTableBody = document.getElementById("countryTableBody");

const totalCountriesEl = document.getElementById("totalCountries");
const totalStationsEl = document.getElementById("totalStations");
const totalProfitableStationsEl = document.getElementById("totalProfitableStations");
const marketCoverageEl = document.getElementById("marketCoverage");
const bestMarketEl = document.getElementById("bestMarket");

const selectedCountryTitle = document.getElementById("selectedCountryTitle");
const selectedCountrySubtitle = document.getElementById("selectedCountrySubtitle");

const panelStations = document.getElementById("panelStations");
const panelAnnualLiters = document.getElementById("panelAnnualLiters");
const panelPrice = document.getElementById("panelPrice");
const panelNetPrice = document.getElementById("panelNetPrice");
const panelAvgLiters = document.getElementById("panelAvgLiters");
const panelThreshold = document.getElementById("panelThreshold");
const panelBaseStations = document.getElementById("panelBaseStations");
const panelCoverage = document.getElementById("panelCoverage");
const panelPayback = document.getElementById("panelPayback");
const panelStatus = document.getElementById("panelStatus");

function saveData() {
  localStorage.setItem("vrrefinerCountriesMap", JSON.stringify(countries));
}

function normalizeIso3(value) {
  if (!value) {
    return "";
  }

  const cleanValue = String(value).trim().toUpperCase();

  if (
    cleanValue === "-99" ||
    cleanValue === "NULL" ||
    cleanValue === "N/A" ||
    cleanValue.length !== 3
  ) {
    return "";
  }

  return cleanValue;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatDecimal(value, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function formatCurrency(value) {
  return `${formatNumber(value)} €`;
}

function litersToMillionLiters(value) {
  return value / MILLION;
}

function millionLitersToLiters(value) {
  return value * MILLION;
}

function getActiveMachineCost() {
  const value = Number(globalMachineCostInput.value);
  return value >= 0 && !isNaN(value) ? value : 20000;
}

function getActiveInstallationCost() {
  const value = Number(globalInstallationCostInput.value);
  return value >= 0 && !isNaN(value) ? value : 5000;
}

function getActiveMaintenanceCost() {
  const value = Number(globalMaintenanceCostInput.value);
  return value >= 0 && !isNaN(value) ? value : 500;
}

function getActiveNetPricePercent() {
  const value = Number(globalNetPricePercentInput.value);
  return value > 0 && value <= 100 && !isNaN(value) ? value : 75;
}

function getActivePaybackYears() {
  const value = Number(globalPaybackInput.value);
  return value > 0 && !isNaN(value) ? value : 4;
}

function getScenarioOverrides() {
  return {
    machineCost: getActiveMachineCost(),
    installationCost: getActiveInstallationCost(),
    maintenanceCost: getActiveMaintenanceCost(),
    netPricePercent: getActiveNetPricePercent(),
    paybackYears: getActivePaybackYears()
  };
}

function updateMachineCostControls(value) {
  const cleanValue = Math.max(0, Number(value));

  globalMachineCostInput.value = cleanValue;
  globalMachineCostSlider.value = cleanValue;
  globalMachineCostLabel.textContent = formatCurrency(cleanValue);

  renderDashboard();
}

function updateInstallationCostControls(value) {
  const cleanValue = Math.max(0, Number(value));

  globalInstallationCostInput.value = cleanValue;
  globalInstallationCostSlider.value = cleanValue;
  globalInstallationCostLabel.textContent = formatCurrency(cleanValue);

  renderDashboard();
}

function updateMaintenanceCostControls(value) {
  const cleanValue = Math.max(0, Number(value));

  globalMaintenanceCostInput.value = cleanValue;
  globalMaintenanceCostSlider.value = cleanValue;
  globalMaintenanceCostLabel.textContent = `${formatCurrency(cleanValue)}/year`;

  renderDashboard();
}

function updateNetPriceControls(value) {
  const cleanValue = Math.min(100, Math.max(1, Number(value)));

  globalNetPricePercentInput.value = cleanValue;
  globalNetPricePercentSlider.value = cleanValue;
  globalNetPricePercentLabel.textContent = `${cleanValue}%`;

  renderDashboard();
}

function updatePaybackControls(value) {
  const cleanValue = Number(value).toFixed(1);

  globalPaybackInput.value = cleanValue;
  globalPaybackSlider.value = cleanValue;
  globalPaybackLabel.textContent = `${cleanValue} years`;

  renderDashboard();
}

function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);

  const y =
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x);

  return sign * y;
}

function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function lognormalSurvival(x, mean, sigma) {
  if (x <= 0 || mean <= 0 || sigma <= 0) {
    return 0;
  }

  const mu = Math.log(mean) - (sigma * sigma) / 2;
  const z = (Math.log(x) - mu) / sigma;

  return 1 - normalCDF(z);
}

function calculateScenario(data, sigma) {
  const probability = lognormalSurvival(
    data.profitabilityThreshold,
    data.averageLitersPerStation,
    sigma
  );

  return {
    sigma: sigma,
    probability: probability,
    profitableStations: probability * data.stations
  };
}

function calculateCountry(data, scenarioOverrides) {
  const machineCost = scenarioOverrides.machineCost;
  const installationCost = scenarioOverrides.installationCost;
  const maintenanceCost = scenarioOverrides.maintenanceCost;
  const netPricePercent = scenarioOverrides.netPricePercent;
  const selectedPayback = scenarioOverrides.paybackYears;

  const totalInvestment = machineCost + installationCost;
  const recoveryRateDecimal = data.recoveryRate / 100;
  const netPriceMultiplier = netPricePercent / 100;

  const effectiveSellingPrice = data.sellingPrice * netPriceMultiplier;

  const averageLitersPerStation = data.annualLiters / data.stations;

  const recoveredLitersPerStation =
    averageLitersPerStation * recoveryRateDecimal;

  const recoveredValuePerStation =
    recoveredLitersPerStation * effectiveSellingPrice;

  const netAnnualBenefit =
    recoveredValuePerStation - maintenanceCost;

  const averagePayback =
    netAnnualBenefit > 0 ? totalInvestment / netAnnualBenefit : Infinity;

  const profitabilityThreshold =
    ((totalInvestment / selectedPayback) + maintenanceCost) /
    (effectiveSellingPrice * recoveryRateDecimal);

  const baseData = {
    ...data,
    machineCost: machineCost,
    installationCost: installationCost,
    maintenanceCost: maintenanceCost,
    netPricePercent: netPricePercent,
    effectiveSellingPrice: effectiveSellingPrice,
    desiredPayback: selectedPayback,
    totalInvestment: totalInvestment,
    averageLitersPerStation: averageLitersPerStation,
    recoveredLitersPerStation: recoveredLitersPerStation,
    recoveredValuePerStation: recoveredValuePerStation,
    netAnnualBenefit: netAnnualBenefit,
    averagePayback: averagePayback,
    profitabilityThreshold: profitabilityThreshold
  };

  const conservativeScenario = calculateScenario(
    baseData,
    data.sigmaConservative
  );

  const baseScenario = calculateScenario(
    baseData,
    data.sigmaBase
  );

  const optimisticScenario = calculateScenario(
    baseData,
    data.sigmaOptimistic
  );

  let marketStatus = "Low potential";
  let statusClass = "low";

  const baseProfitableShare =
    baseScenario.profitableStations / data.stations;

  if (averagePayback <= selectedPayback && baseProfitableShare >= 0.25) {
    marketStatus = "Highly attractive";
    statusClass = "high";
  } else if (
    averagePayback <= selectedPayback * 1.5 ||
    baseProfitableShare >= 0.10
  ) {
    marketStatus = "Moderate potential";
    statusClass = "medium";
  }

  return {
    machineCost: machineCost,
    installationCost: installationCost,
    maintenanceCost: maintenanceCost,
    netPricePercent: netPricePercent,
    effectiveSellingPrice: effectiveSellingPrice,
    totalInvestment: totalInvestment,
    desiredPayback: selectedPayback,
    averageLitersPerStation: averageLitersPerStation,
    recoveredLitersPerStation: recoveredLitersPerStation,
    recoveredValuePerStation: recoveredValuePerStation,
    netAnnualBenefit: netAnnualBenefit,
    averagePayback: averagePayback,
    profitabilityThreshold: profitabilityThreshold,
    conservativeScenario: conservativeScenario,
    baseScenario: baseScenario,
    optimisticScenario: optimisticScenario,
    marketStatus: marketStatus,
    statusClass: statusClass
  };
}

function getCalculatedCountries() {
  const scenarioOverrides = getScenarioOverrides();

  return countries
    .map(function (country) {
      const recalculated = calculateCountry(country, scenarioOverrides);

      return {
        ...country,
        iso3: normalizeIso3(country.iso3),
        ...recalculated
      };
    })
    .filter(function (country) {
      return country.iso3;
    });
}

function getCoverageBase(country) {
  if (!country || country.stations <= 0) {
    return 0;
  }

  return (country.baseScenario.profitableStations / country.stations) * 100;
}

function getSortedCalculatedCountries() {
  const sortMode = sortByInput ? sortByInput.value : "baseStations";

  return [...getCalculatedCountries()].sort(function (a, b) {
    if (sortMode === "price") {
      return b.sellingPrice - a.sellingPrice;
    }

    if (sortMode === "consumption") {
      return b.annualLiters - a.annualLiters;
    }

    if (sortMode === "stations") {
      return b.stations - a.stations;
    }

    if (sortMode === "coverage") {
      return getCoverageBase(b) - getCoverageBase(a);
    }

    if (sortMode === "payback") {
      const paybackA = a.averagePayback === Infinity ? Number.MAX_VALUE : a.averagePayback;
      const paybackB = b.averagePayback === Infinity ? Number.MAX_VALUE : b.averagePayback;

      return paybackA - paybackB;
    }

    if (sortMode === "avgLiters") {
      return b.averageLitersPerStation - a.averageLitersPerStation;
    }

    if (sortMode === "country") {
      return a.country.localeCompare(b.country);
    }

    return b.baseScenario.profitableStations - a.baseScenario.profitableStations;
  });
}

function findCountryByIso(iso3) {
  const cleanIso = normalizeIso3(iso3);

  if (!cleanIso) {
    return null;
  }

  return countries.find(function (country) {
    return normalizeIso3(country.iso3) === cleanIso;
  });
}

function getCalculatedCountryByIso(iso3) {
  const cleanIso = normalizeIso3(iso3);

  if (!cleanIso) {
    return null;
  }

  return getCalculatedCountries().find(function (country) {
    return normalizeIso3(country.iso3) === cleanIso;
  });
}

function getCountryColor(country) {
  if (!country) {
    return "#cbd5e1";
  }

  if (country.statusClass === "high") {
    return "#22c55e";
  }

  if (country.statusClass === "medium") {
    return "#f59e0b";
  }

  return "#ef4444";
}

function getFeatureName(feature) {
  const props = feature.properties || {};

  return (
    props.ADMIN ||
    props.NAME ||
    props.name ||
    props.COUNTRY ||
    "Unknown country"
  );
}

function getFeatureIso3(feature) {
  const props = feature.properties || {};

  const countryName = getFeatureName(feature).trim();

  const isoFixByName = {
    "France": "FRA",
    "Norway": "NOR",
    "Kosovo": "XKX",
    "Somaliland": "SOM"
  };

  if (isoFixByName[countryName]) {
    return isoFixByName[countryName];
  }

  const possibleValues = [
    props.ADM0_A3,
    props.ISO_A3,
    props.ISO3,
    props.iso_a3,
    props["ISO3166-1-Alpha-3"],
    props.ISO_A3_EH
  ];

  for (let i = 0; i < possibleValues.length; i++) {
    const cleanIso = normalizeIso3(possibleValues[i]);

    if (cleanIso) {
      return cleanIso;
    }
  }

  return "";
}

function getMapStyle(feature) {
  const iso3 = getFeatureIso3(feature);
  const calculatedCountry = getCalculatedCountryByIso(iso3);

  const isSelected = selectedIso3 && selectedIso3 === iso3;

  return {
    fillColor: getCountryColor(calculatedCountry),
    weight: isSelected ? 2.5 : 1,
    color: isSelected ? "#0f172a" : "#ffffff",
    fillOpacity: calculatedCountry ? 0.78 : 0.45
  };
}

function getTooltipContent(feature) {
  const iso3 = getFeatureIso3(feature);
  const countryName = getFeatureName(feature);
  const calculatedCountry = getCalculatedCountryByIso(iso3);

  if (!calculatedCountry) {
    return `${countryName}<br>No data`;
  }

  return `
    <strong>${calculatedCountry.country}</strong><br>
    Stations: ${formatNumber(calculatedCountry.stations)}<br>
    Gasoline: ${formatDecimal(litersToMillionLiters(calculatedCountry.annualLiters), 1)} million L/year<br>
    Price: ${formatDecimal(calculatedCountry.sellingPrice, 2)} €/L<br>
    Net value: ${formatDecimal(calculatedCountry.effectiveSellingPrice, 2)} €/L<br>
    Status: ${calculatedCountry.marketStatus}
  `;
}

function refreshMapStyles() {
  if (!geoJsonLayer) {
    return;
  }

  geoJsonLayer.eachLayer(function (layer) {
    layer.setStyle(getMapStyle(layer.feature));
    layer.unbindTooltip();
    layer.bindTooltip(getTooltipContent(layer.feature), {
      sticky: true
    });
  });
}

function selectCountryFromFeature(feature) {
  const iso3 = getFeatureIso3(feature);
  const countryName = getFeatureName(feature);

  if (!iso3) {
    alert("This country does not have a valid ISO3 code in the map data.");
    return;
  }

  selectedIso3 = iso3;
  selectedCountryName = countryName;

  const existingCountry = findCountryByIso(iso3);

  iso3Input.value = iso3;
  countryInput.value = existingCountry ? existingCountry.country : countryName;

  if (existingCountry) {
    stationsInput.value = existingCountry.stations;
    annualLitersInput.value = litersToMillionLiters(existingCountry.annualLiters);
    sellingPriceInput.value = existingCountry.sellingPrice;
    recoveryRateInput.value = existingCountry.recoveryRate;
    sigmaConservativeInput.value = existingCountry.sigmaConservative;
    sigmaBaseInput.value = existingCountry.sigmaBase;
    sigmaOptimisticInput.value = existingCountry.sigmaOptimistic;
  } else {
    stationsInput.value = "";
    annualLitersInput.value = "";
    sellingPriceInput.value = "";
    recoveryRateInput.value = "0.10";
    sigmaConservativeInput.value = "0.40";
    sigmaBaseInput.value = "0.82";
    sigmaOptimisticInput.value = "1.20";
  }

  renderDashboard();
}

function selectCountryFromTable(iso3) {
  const calculatedCountry = getCalculatedCountryByIso(iso3);

  if (!calculatedCountry) {
    return;
  }

  selectedIso3 = calculatedCountry.iso3;
  selectedCountryName = calculatedCountry.country;

  iso3Input.value = calculatedCountry.iso3;
  countryInput.value = calculatedCountry.country;
  stationsInput.value = calculatedCountry.stations;
  annualLitersInput.value = litersToMillionLiters(calculatedCountry.annualLiters);
  sellingPriceInput.value = calculatedCountry.sellingPrice;
  recoveryRateInput.value = calculatedCountry.recoveryRate;
  sigmaConservativeInput.value = calculatedCountry.sigmaConservative;
  sigmaBaseInput.value = calculatedCountry.sigmaBase;
  sigmaOptimisticInput.value = calculatedCountry.sigmaOptimistic;

  renderDashboard();
}

function renderSelectedCountryPanel() {
  if (!selectedIso3) {
    selectedCountryTitle.textContent = "Select a country";
    selectedCountrySubtitle.textContent =
      "Click a country on the map or use the form below.";

    panelStations.textContent = "-";
    panelAnnualLiters.textContent = "-";
    panelPrice.textContent = "-";
    panelNetPrice.textContent = "-";
    panelAvgLiters.textContent = "-";
    panelThreshold.textContent = "-";
    panelBaseStations.textContent = "-";
    panelCoverage.textContent = "-";
    panelPayback.textContent = "-";

    panelStatus.className = "panel-status empty-status";
    panelStatus.textContent = "No data";

    return;
  }

  const calculatedCountry = getCalculatedCountryByIso(selectedIso3);

  if (!calculatedCountry) {
    selectedCountryTitle.textContent = selectedCountryName || "Selected country";
    selectedCountrySubtitle.textContent =
      "No data saved yet. Fill the form and click Save / Update Country.";

    panelStations.textContent = "-";
    panelAnnualLiters.textContent = "-";
    panelPrice.textContent = "-";
    panelNetPrice.textContent = "-";
    panelAvgLiters.textContent = "-";
    panelThreshold.textContent = "-";
    panelBaseStations.textContent = "-";
    panelCoverage.textContent = "-";
    panelPayback.textContent = "-";

    panelStatus.className = "panel-status empty-status";
    panelStatus.textContent = "No data";

    return;
  }

  const coverageBase = getCoverageBase(calculatedCountry);

  const paybackText =
    calculatedCountry.averagePayback === Infinity
      ? "Not profitable"
      : `${formatDecimal(calculatedCountry.averagePayback, 1)} years`;

  selectedCountryTitle.textContent = calculatedCountry.country;
  selectedCountrySubtitle.textContent = `ISO3: ${calculatedCountry.iso3}`;

  panelStations.textContent = formatNumber(calculatedCountry.stations);
  panelAnnualLiters.textContent =
    `${formatDecimal(litersToMillionLiters(calculatedCountry.annualLiters), 1)} million L/year`;
  panelPrice.textContent =
    `${formatDecimal(calculatedCountry.sellingPrice, 2)} €/L`;
  panelNetPrice.textContent =
    `${formatDecimal(calculatedCountry.effectiveSellingPrice, 2)} €/L (${calculatedCountry.netPricePercent}%)`;
  panelAvgLiters.textContent =
    `${formatNumber(calculatedCountry.averageLitersPerStation)} L/year`;
  panelThreshold.textContent =
    `${formatNumber(calculatedCountry.profitabilityThreshold)} L/year`;
  panelBaseStations.textContent =
    formatNumber(calculatedCountry.baseScenario.profitableStations);
  panelCoverage.textContent = `${formatDecimal(coverageBase, 2)}%`;
  panelPayback.textContent = paybackText;

  panelStatus.className = `panel-status ${calculatedCountry.statusClass}-status`;
  panelStatus.textContent = calculatedCountry.marketStatus;
}

function initMap() {
  worldMap = L.map("worldMap", {
    zoomControl: true,
    worldCopyJump: true
  }).setView([25, 5], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 6,
    minZoom: 2
  }).addTo(worldMap);

  fetch(WORLD_GEOJSON_URL)
    .then(function (response) {
      return response.json();
    })
    .then(function (geojson) {
      geoJsonLayer = L.geoJSON(geojson, {
        style: getMapStyle,
        onEachFeature: function (feature, layer) {
          layer.bindTooltip(getTooltipContent(feature), {
            sticky: true
          });

          layer.on("mouseover", function () {
            layer.setStyle({
              weight: 2,
              color: "#0f172a"
            });
          });

          layer.on("mouseout", function () {
            layer.setStyle(getMapStyle(feature));
          });

          layer.on("click", function () {
            selectCountryFromFeature(feature);
          });
        }
      }).addTo(worldMap);

      renderDashboard();
    })
    .catch(function () {
      alert("The world map could not be loaded. Check your internet connection.");
    });
}

function addCountry() {
  const country = countryInput.value.trim();
  const iso3 = normalizeIso3(iso3Input.value);

  if (!iso3) {
    alert("Please select the country from the map before saving it.");
    return;
  }

  const data = {
    id: Date.now(),
    iso3: iso3,
    country: country,
    stations: Number(stationsInput.value),
    annualLiters: millionLitersToLiters(Number(annualLitersInput.value)),
    sellingPrice: Number(sellingPriceInput.value),
    recoveryRate: Number(recoveryRateInput.value),
    sigmaConservative: Number(sigmaConservativeInput.value),
    sigmaBase: Number(sigmaBaseInput.value),
    sigmaOptimistic: Number(sigmaOptimisticInput.value)
  };

  if (!data.country) {
    alert("Please enter a country or region.");
    return;
  }

  if (
    data.stations <= 0 ||
    data.annualLiters <= 0 ||
    data.sellingPrice <= 0 ||
    data.recoveryRate <= 0 ||
    data.sigmaConservative <= 0 ||
    data.sigmaBase <= 0 ||
    data.sigmaOptimistic <= 0
  ) {
    alert("Please fill all fields with valid positive values.");
    return;
  }

  const existingIndex = countries.findIndex(function (countryItem) {
    return normalizeIso3(countryItem.iso3) === data.iso3;
  });

  if (existingIndex >= 0) {
    countries[existingIndex] = {
      ...countries[existingIndex],
      ...data,
      id: countries[existingIndex].id
    };
  } else {
    countries.push(data);
  }

  selectedIso3 = data.iso3;
  selectedCountryName = data.country;

  saveData();
  renderDashboard();
}

function clearForm(resetSelection = true) {
  if (resetSelection) {
    selectedIso3 = null;
    selectedCountryName = null;
    iso3Input.value = "";
  }

  countryInput.value = "";
  stationsInput.value = "";
  annualLitersInput.value = "";
  sellingPriceInput.value = "";
  recoveryRateInput.value = "0.10";

  sigmaConservativeInput.value = "0.40";
  sigmaBaseInput.value = "0.82";
  sigmaOptimisticInput.value = "1.20";

  renderDashboard();
}

function deleteCountry(iso3) {
  const cleanIso = normalizeIso3(iso3);

  countries = countries.filter(function (country) {
    return normalizeIso3(country.iso3) !== cleanIso;
  });

  if (selectedIso3 === cleanIso) {
    clearForm(true);
  }

  saveData();
  renderDashboard();
}

function deleteAllCountries() {
  if (countries.length === 0) {
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete all countries?");

  if (!confirmDelete) {
    return;
  }

  countries = [];
  clearForm(true);
  saveData();
  renderDashboard();
}

function renderTable() {
  const sortedCountries = getSortedCalculatedCountries();

  countryTableBody.innerHTML = "";

  sortedCountries.forEach(function (country, index) {
    const row = document.createElement("tr");

    if (selectedIso3 === country.iso3) {
      row.classList.add("selected-row");
    }

    const paybackText =
      country.averagePayback === Infinity
        ? "Not profitable"
        : `${formatDecimal(country.averagePayback, 1)} years`;

    const coverageBase = getCoverageBase(country);

    row.innerHTML = `
      <td><strong>#${index + 1}</strong></td>
      <td><strong>${country.country}</strong></td>
      <td>${formatNumber(country.stations)}</td>
      <td>${formatDecimal(litersToMillionLiters(country.annualLiters), 1)}</td>
      <td>${formatDecimal(country.sellingPrice, 2)}</td>
      <td>${formatDecimal(country.effectiveSellingPrice, 2)}</td>
      <td>${formatNumber(country.averageLitersPerStation)} L</td>
      <td>${formatNumber(country.profitabilityThreshold)} L</td>
      <td>${formatNumber(country.conservativeScenario.profitableStations)}</td>
      <td><strong>${formatNumber(country.baseScenario.profitableStations)}</strong></td>
      <td>${formatNumber(country.optimisticScenario.profitableStations)}</td>
      <td><strong>${formatDecimal(coverageBase, 2)}%</strong></td>
      <td>${paybackText}</td>
      <td>
        <span class="status ${country.statusClass}">
          ${country.marketStatus}
        </span>
      </td>
      <td>
        <button class="delete-row-btn" onclick="deleteCountry('${country.iso3}')">
          Delete
        </button>
      </td>
    `;

    row.addEventListener("click", function (event) {
      if (event.target.tagName.toLowerCase() === "button") {
        return;
      }

      selectCountryFromTable(country.iso3);
    });

    countryTableBody.appendChild(row);
  });
}

function renderKPIs() {
  const calculatedCountries = getCalculatedCountries();

  const totalCountries = calculatedCountries.length;

  const totalStations = calculatedCountries.reduce(function (sum, country) {
    return sum + country.stations;
  }, 0);

  const totalProfitableStations = calculatedCountries.reduce(function (sum, country) {
    return sum + country.baseScenario.profitableStations;
  }, 0);

  const marketCoverage =
    totalStations > 0
      ? (totalProfitableStations / totalStations) * 100
      : 0;

  let bestMarket = "-";

  if (calculatedCountries.length > 0) {
    const bestSortedCountries = [...calculatedCountries].sort(function (a, b) {
      return b.baseScenario.profitableStations - a.baseScenario.profitableStations;
    });

    bestMarket = bestSortedCountries[0].country;
  }

  totalCountriesEl.textContent = formatNumber(totalCountries);
  totalStationsEl.textContent = formatNumber(totalStations);
  totalProfitableStationsEl.textContent = formatNumber(totalProfitableStations);
  marketCoverageEl.textContent = `${formatDecimal(marketCoverage, 2)}%`;
  bestMarketEl.textContent = bestMarket;
}

function renderCharts() {
  const sortedCountries = [...getCalculatedCountries()]
    .sort(function (a, b) {
      return b.baseScenario.profitableStations - a.baseScenario.profitableStations;
    })
    .slice(0, 12);

  const countryLabels = sortedCountries.map(function (country) {
    return country.country;
  });

  const conservativeData = sortedCountries.map(function (country) {
    return Math.round(country.conservativeScenario.profitableStations);
  });

  const baseData = sortedCountries.map(function (country) {
    return Math.round(country.baseScenario.profitableStations);
  });

  const optimisticData = sortedCountries.map(function (country) {
    return Math.round(country.optimisticScenario.profitableStations);
  });

  const averageLitersData = sortedCountries.map(function (country) {
    return Math.round(country.averageLitersPerStation);
  });

  const profitableCtx = document
    .getElementById("profitableStationsChart")
    .getContext("2d");

  const averageCtx = document
    .getElementById("averageLitersChart")
    .getContext("2d");

  if (profitableStationsChart) {
    profitableStationsChart.destroy();
  }

  if (averageLitersChart) {
    averageLitersChart.destroy();
  }

  profitableStationsChart = new Chart(profitableCtx, {
    type: "bar",
    data: {
      labels: countryLabels,
      datasets: [
        {
          label: "Conservative scenario",
          data: conservativeData,
          backgroundColor: "#94a3b8",
          borderRadius: 8
        },
        {
          label: "Base scenario",
          data: baseData,
          backgroundColor: "#2563eb",
          borderRadius: 8
        },
        {
          label: "Optimistic scenario",
          data: optimisticData,
          backgroundColor: "#f59e0b",
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${formatNumber(context.raw)} profitable stations`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });

  averageLitersChart = new Chart(averageCtx, {
    type: "bar",
    data: {
      labels: countryLabels,
      datasets: [
        {
          label: "Average liters per station",
          data: averageLitersData,
          backgroundColor: "#10b981",
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${formatNumber(context.raw)} L/year`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });
}

function renderDashboard() {
  renderKPIs();
  renderTable();
  renderSelectedCountryPanel();
  refreshMapStyles();
  renderCharts();
}

function exportCSV() {
  const calculatedCountries = getSortedCalculatedCountries();

  if (calculatedCountries.length === 0) {
    alert("There is no data to export.");
    return;
  }

  const headers = [
    "Rank",
    "Country",
    "Service stations",
    "Annual gasoline sold (million L)",
    "Gasoline price",
    "Net price",
    "Conservative",
    "Base",
    "Optimistic",
    "Average payback"
  ];

  const rows = calculatedCountries.map(function (country, index) {
    return [
      index + 1,
      country.country,
      country.stations,
      formatDecimal(litersToMillionLiters(country.annualLiters), 1),
      formatDecimal(country.sellingPrice, 2),
      formatDecimal(country.effectiveSellingPrice, 2),
      Math.round(country.conservativeScenario.profitableStations),
      Math.round(country.baseScenario.profitableStations),
      Math.round(country.optimisticScenario.profitableStations),
      country.averagePayback === Infinity
        ? "Not profitable"
        : formatDecimal(country.averagePayback, 2)
    ];
  });

  const csvContent = [
    headers.join(";"),
    ...rows.map(function (row) {
      return row.join(";");
    })
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "vrrefiner_market_study.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function exportDataJSON() {
  const data = {
    countries: countries,
    scenario: getScenarioOverrides()
  };

  const jsonContent = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonContent], {
    type: "application/json;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "vrrefiner_dashboard_data.json";
  link.click();

  URL.revokeObjectURL(url);
}

function importDataJSON(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);

      if (!imported.countries || !Array.isArray(imported.countries)) {
        alert("Invalid JSON file.");
        return;
      }

      countries = imported.countries
        .map(function (country) {
          return {
            ...country,
            iso3: normalizeIso3(country.iso3)
          };
        })
        .filter(function (country) {
          return country.iso3;
        });

      if (imported.scenario) {
        updateMachineCostControls(imported.scenario.machineCost || 20000);
        updateInstallationCostControls(imported.scenario.installationCost || 5000);
        updateMaintenanceCostControls(imported.scenario.maintenanceCost || 500);
        updateNetPriceControls(imported.scenario.netPricePercent || 75);
        updatePaybackControls(imported.scenario.paybackYears || 4);
      }

      saveData();
      renderDashboard();

      alert("Dashboard data imported successfully.");
    } catch (error) {
      alert("Could not import JSON file.");
    }
  };

  reader.readAsText(file);
}

addCountryBtn.addEventListener("click", addCountry);

clearFormBtn.addEventListener("click", function () {
  clearForm(true);
});

deleteAllBtn.addEventListener("click", deleteAllCountries);
exportBtn.addEventListener("click", exportCSV);
exportDataBtn.addEventListener("click", exportDataJSON);
importDataInput.addEventListener("change", importDataJSON);

sortByInput.addEventListener("change", function () {
  renderDashboard();
});

globalMachineCostInput.addEventListener("input", function () {
  updateMachineCostControls(globalMachineCostInput.value);
});

globalMachineCostSlider.addEventListener("input", function () {
  updateMachineCostControls(globalMachineCostSlider.value);
});

globalInstallationCostInput.addEventListener("input", function () {
  updateInstallationCostControls(globalInstallationCostInput.value);
});

globalInstallationCostSlider.addEventListener("input", function () {
  updateInstallationCostControls(globalInstallationCostSlider.value);
});

globalMaintenanceCostInput.addEventListener("input", function () {
  updateMaintenanceCostControls(globalMaintenanceCostInput.value);
});

globalMaintenanceCostSlider.addEventListener("input", function () {
  updateMaintenanceCostControls(globalMaintenanceCostSlider.value);
});

globalNetPricePercentInput.addEventListener("input", function () {
  updateNetPriceControls(globalNetPricePercentInput.value);
});

globalNetPricePercentSlider.addEventListener("input", function () {
  updateNetPriceControls(globalNetPricePercentSlider.value);
});

globalPaybackInput.addEventListener("input", function () {
  updatePaybackControls(globalPaybackInput.value);
});

globalPaybackSlider.addEventListener("input", function () {
  updatePaybackControls(globalPaybackSlider.value);
});

updateMachineCostControls("20000");
updateInstallationCostControls("5000");
updateMaintenanceCostControls("500");
updateNetPriceControls("75");
updatePaybackControls("4");

initMap();