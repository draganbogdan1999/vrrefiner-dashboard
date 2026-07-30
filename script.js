let countries = JSON.parse(localStorage.getItem("vrrefinerCountriesMap")) || [];

const DEFAULT_SCENARIO = {
  machineCost: 20000,
  installationCost: 5000,
  maintenanceCost: 500,
  netPricePercent: 75,
  projectLifetime: 20,
  targetIrrPercent: 15,
  salesGrowthPercent: 0,
  priceGrowthPercent: 2
};

let appliedScenarioOverrides =
  JSON.parse(localStorage.getItem("vrrefinerScenarioOverrides")) ||
  DEFAULT_SCENARIO;

let profitableStationsChart = null;
let averageIrrChart = null;

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

const globalProjectLifetimeInput = document.getElementById("globalProjectLifetime");
const globalProjectLifetimeSlider = document.getElementById("globalProjectLifetimeSlider");
const globalProjectLifetimeLabel = document.getElementById("globalProjectLifetimeLabel");

const globalTargetIrrInput = document.getElementById("globalTargetIrr");
const globalTargetIrrSlider = document.getElementById("globalTargetIrrSlider");
const globalTargetIrrLabel = document.getElementById("globalTargetIrrLabel");

const globalSalesGrowthInput = document.getElementById("globalSalesGrowth");
const globalSalesGrowthSlider = document.getElementById("globalSalesGrowthSlider");
const globalSalesGrowthLabel = document.getElementById("globalSalesGrowthLabel");

const globalPriceGrowthInput = document.getElementById("globalPriceGrowth");
const globalPriceGrowthSlider = document.getElementById("globalPriceGrowthSlider");
const globalPriceGrowthLabel = document.getElementById("globalPriceGrowthLabel");

const calculateScenarioBtn = document.getElementById("calculateScenarioBtn");
const scenarioPendingLabel = document.getElementById("scenarioPendingLabel");

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
const panelIrr = document.getElementById("panelIrr");
const panelPayback = document.getElementById("panelPayback");
const panelStatus = document.getElementById("panelStatus");

function saveData() {
  localStorage.setItem("vrrefinerCountriesMap", JSON.stringify(countries));
}

function saveScenario() {
  localStorage.setItem(
    "vrrefinerScenarioOverrides",
    JSON.stringify(appliedScenarioOverrides)
  );
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

function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || !isFinite(value)) {
    return "N/A";
  }

  return `${formatDecimal(value * 100, decimals)}%`;
}

function litersToMillionLiters(value) {
  return value / MILLION;
}

function millionLitersToLiters(value) {
  return value * MILLION;
}

function getControlScenarioValues() {
  return {
    machineCost: getControlNumber(globalMachineCostInput, 20000),
    installationCost: getControlNumber(globalInstallationCostInput, 5000),
    maintenanceCost: getControlNumber(globalMaintenanceCostInput, 500),
    netPricePercent: getControlNumber(globalNetPricePercentInput, 75),
    projectLifetime: Math.round(getControlNumber(globalProjectLifetimeInput, 20)),
    targetIrrPercent: getControlNumber(globalTargetIrrInput, 15),
    salesGrowthPercent: getControlNumber(globalSalesGrowthInput, 0),
    priceGrowthPercent: getControlNumber(globalPriceGrowthInput, 2)
  };
}

function getControlNumber(input, fallback) {
  const value = Number(input.value);

  if (isNaN(value)) {
    return fallback;
  }

  return value;
}

function getScenarioOverrides() {
  return appliedScenarioOverrides;
}

function markScenarioPending() {
  scenarioPendingLabel.textContent = "Pending changes - click Calculate Scenario";
  scenarioPendingLabel.classList.add("pending");
  calculateScenarioBtn.classList.add("attention");
}

function markScenarioApplied() {
  scenarioPendingLabel.textContent = "Scenario applied";
  scenarioPendingLabel.classList.remove("pending");
  calculateScenarioBtn.classList.remove("attention");
}

function applyScenarioChanges() {
  appliedScenarioOverrides = getControlScenarioValues();

  if (appliedScenarioOverrides.machineCost < 0) {
    appliedScenarioOverrides.machineCost = 0;
  }

  if (appliedScenarioOverrides.installationCost < 0) {
    appliedScenarioOverrides.installationCost = 0;
  }

  if (appliedScenarioOverrides.maintenanceCost < 0) {
    appliedScenarioOverrides.maintenanceCost = 0;
  }

  if (appliedScenarioOverrides.netPricePercent <= 0) {
    appliedScenarioOverrides.netPricePercent = 1;
  }

  if (appliedScenarioOverrides.netPricePercent > 100) {
    appliedScenarioOverrides.netPricePercent = 100;
  }

  if (appliedScenarioOverrides.projectLifetime < 1) {
    appliedScenarioOverrides.projectLifetime = 1;
  }

  if (appliedScenarioOverrides.targetIrrPercent < 0) {
    appliedScenarioOverrides.targetIrrPercent = 0;
  }

  setScenarioControls(appliedScenarioOverrides, false);
  saveScenario();
  markScenarioApplied();
  renderDashboard();
}

function setScenarioControls(scenario, pending = false) {
  updateMachineCostControls(scenario.machineCost, pending);
  updateInstallationCostControls(scenario.installationCost, pending);
  updateMaintenanceCostControls(scenario.maintenanceCost, pending);
  updateNetPriceControls(scenario.netPricePercent, pending);
  updateProjectLifetimeControls(scenario.projectLifetime, pending);
  updateTargetIrrControls(scenario.targetIrrPercent, pending);
  updateSalesGrowthControls(scenario.salesGrowthPercent, pending);
  updatePriceGrowthControls(scenario.priceGrowthPercent, pending);

  if (!pending) {
    markScenarioApplied();
  }
}

function updateMachineCostControls(value, pending = true) {
  const cleanValue = Math.max(0, Number(value));

  globalMachineCostInput.value = cleanValue;
  globalMachineCostSlider.value = cleanValue;
  globalMachineCostLabel.textContent = formatCurrency(cleanValue);

  if (pending) {
    markScenarioPending();
  }
}

function updateInstallationCostControls(value, pending = true) {
  const cleanValue = Math.max(0, Number(value));

  globalInstallationCostInput.value = cleanValue;
  globalInstallationCostSlider.value = cleanValue;
  globalInstallationCostLabel.textContent = formatCurrency(cleanValue);

  if (pending) {
    markScenarioPending();
  }
}

function updateMaintenanceCostControls(value, pending = true) {
  const cleanValue = Math.max(0, Number(value));

  globalMaintenanceCostInput.value = cleanValue;
  globalMaintenanceCostSlider.value = cleanValue;
  globalMaintenanceCostLabel.textContent = `${formatCurrency(cleanValue)}/year`;

  if (pending) {
    markScenarioPending();
  }
}

function updateNetPriceControls(value, pending = true) {
  const cleanValue = Math.min(100, Math.max(1, Number(value)));

  globalNetPricePercentInput.value = cleanValue;
  globalNetPricePercentSlider.value = cleanValue;
  globalNetPricePercentLabel.textContent = `${cleanValue}%`;

  if (pending) {
    markScenarioPending();
  }
}

function updateProjectLifetimeControls(value, pending = true) {
  const cleanValue = Math.max(1, Math.round(Number(value)));

  globalProjectLifetimeInput.value = cleanValue;
  globalProjectLifetimeSlider.value = cleanValue;
  globalProjectLifetimeLabel.textContent = `${cleanValue} years`;

  if (pending) {
    markScenarioPending();
  }
}

function updateTargetIrrControls(value, pending = true) {
  const cleanValue = Math.max(0, Number(value)).toFixed(1);

  globalTargetIrrInput.value = cleanValue;
  globalTargetIrrSlider.value = cleanValue;
  globalTargetIrrLabel.textContent = `${cleanValue}%`;

  if (pending) {
    markScenarioPending();
  }
}

function updateSalesGrowthControls(value, pending = true) {
  const cleanValue = Number(value).toFixed(1);

  globalSalesGrowthInput.value = cleanValue;
  globalSalesGrowthSlider.value = cleanValue;
  globalSalesGrowthLabel.textContent = `${cleanValue}%`;

  if (pending) {
    markScenarioPending();
  }
}

function updatePriceGrowthControls(value, pending = true) {
  const cleanValue = Number(value).toFixed(1);

  globalPriceGrowthInput.value = cleanValue;
  globalPriceGrowthSlider.value = cleanValue;
  globalPriceGrowthLabel.textContent = `${cleanValue}%`;

  if (pending) {
    markScenarioPending();
  }
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

function calculateNPV(cashflows, rate) {
  let npv = 0;

  for (let i = 0; i < cashflows.length; i++) {
    npv += cashflows[i] / Math.pow(1 + rate, i);
  }

  return npv;
}

function calculateIRR(cashflows) {
  const hasPositive = cashflows.some(function (cashflow) {
    return cashflow > 0;
  });

  const hasNegative = cashflows.some(function (cashflow) {
    return cashflow < 0;
  });

  if (!hasPositive || !hasNegative) {
    return null;
  }

  let low = -0.9999;
  let high = 10;

  let npvLow = calculateNPV(cashflows, low);
  let npvHigh = calculateNPV(cashflows, high);

  if (npvLow < 0) {
    return null;
  }

  if (npvHigh > 0) {
    return high;
  }

  for (let i = 0; i < 120; i++) {
    const mid = (low + high) / 2;
    const npvMid = calculateNPV(cashflows, mid);

    if (Math.abs(npvMid) < 0.000001) {
      return mid;
    }

    if (npvMid > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function calculateSimplePayback(cashflows) {
  const investment = Math.abs(cashflows[0]);
  let cumulative = 0;

  for (let year = 1; year < cashflows.length; year++) {
    const annualCashflow = cashflows[year];

    if (annualCashflow <= 0) {
      cumulative += annualCashflow;
      continue;
    }

    if (cumulative + annualCashflow >= investment) {
      const remaining = investment - cumulative;
      return (year - 1) + remaining / annualCashflow;
    }

    cumulative += annualCashflow;
  }

  return Infinity;
}

function buildCashflows(initialAnnualLiters, data, scenarioOverrides) {
  const investment =
    scenarioOverrides.machineCost + scenarioOverrides.installationCost;

  const recoveryRateDecimal = data.recoveryRate / 100;
  const netPriceMultiplier = scenarioOverrides.netPricePercent / 100;
  const effectiveSellingPrice = data.sellingPrice * netPriceMultiplier;

  const salesGrowthDecimal = scenarioOverrides.salesGrowthPercent / 100;
  const priceGrowthDecimal = scenarioOverrides.priceGrowthPercent / 100;

  const cashflows = [-investment];

  for (let year = 1; year <= scenarioOverrides.projectLifetime; year++) {
    const salesFactor = Math.pow(1 + salesGrowthDecimal, year - 1);
    const priceFactor = Math.pow(1 + priceGrowthDecimal, year - 1);

    const annualRecoveredLiters =
      initialAnnualLiters * salesFactor * recoveryRateDecimal;

    const annualRecoveredValue =
      annualRecoveredLiters * effectiveSellingPrice * priceFactor;

    const annualNetBenefit =
      annualRecoveredValue - scenarioOverrides.maintenanceCost;

    cashflows.push(annualNetBenefit);
  }

  return cashflows;
}

function calculateIrrThresholdLiters(data, scenarioOverrides) {
  const investment =
    scenarioOverrides.machineCost + scenarioOverrides.installationCost;

  const recoveryRateDecimal = data.recoveryRate / 100;
  const effectiveSellingPrice =
    data.sellingPrice * (scenarioOverrides.netPricePercent / 100);

  const targetIrrDecimal = scenarioOverrides.targetIrrPercent / 100;
  const salesGrowthDecimal = scenarioOverrides.salesGrowthPercent / 100;
  const priceGrowthDecimal = scenarioOverrides.priceGrowthPercent / 100;

  const combinedGrowth =
    (1 + salesGrowthDecimal) * (1 + priceGrowthDecimal);

  let revenueFactor = 0;
  let maintenanceFactor = 0;

  for (let year = 1; year <= scenarioOverrides.projectLifetime; year++) {
    const discountFactor = 1 / Math.pow(1 + targetIrrDecimal, year);

    revenueFactor +=
      Math.pow(combinedGrowth, year - 1) * discountFactor;

    maintenanceFactor += discountFactor;
  }

  const denominator =
    recoveryRateDecimal * effectiveSellingPrice * revenueFactor;

  if (denominator <= 0) {
    return Infinity;
  }

  return (
    investment +
    scenarioOverrides.maintenanceCost * maintenanceFactor
  ) / denominator;
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

function calculateScenarioSet(baseData, sourceData) {
  const lowDispersionScenario = {
    label: "Low dispersion",
    ...calculateScenario(baseData, sourceData.sigmaConservative)
  };

  const baseScenario = {
    label: "Base",
    ...calculateScenario(baseData, sourceData.sigmaBase)
  };

  const highDispersionScenario = {
    label: "High dispersion",
    ...calculateScenario(baseData, sourceData.sigmaOptimistic)
  };

  const scenarios = [
    lowDispersionScenario,
    baseScenario,
    highDispersionScenario
  ];

  const sortedByStations = [...scenarios].sort(function (a, b) {
    return a.profitableStations - b.profitableStations;
  });

  return {
    conservativeScenario: sortedByStations[0],
    baseScenario: baseScenario,
    optimisticScenario: sortedByStations[sortedByStations.length - 1],
    rawScenarios: {
      lowDispersionScenario,
      baseScenario,
      highDispersionScenario
    }
  };
}

function calculateCountry(data, scenarioOverrides) {
  const totalInvestment =
    scenarioOverrides.machineCost + scenarioOverrides.installationCost;

  const effectiveSellingPrice =
    data.sellingPrice * (scenarioOverrides.netPricePercent / 100);

  const averageLitersPerStation = data.annualLiters / data.stations;

  const cashflows = buildCashflows(
    averageLitersPerStation,
    data,
    scenarioOverrides
  );

  const averageIRR = calculateIRR(cashflows);
  const simplePayback = calculateSimplePayback(cashflows);

  const profitabilityThreshold =
    calculateIrrThresholdLiters(data, scenarioOverrides);

  const baseData = {
    ...data,
    machineCost: scenarioOverrides.machineCost,
    installationCost: scenarioOverrides.installationCost,
    maintenanceCost: scenarioOverrides.maintenanceCost,
    netPricePercent: scenarioOverrides.netPricePercent,
    effectiveSellingPrice: effectiveSellingPrice,
    projectLifetime: scenarioOverrides.projectLifetime,
    targetIrrPercent: scenarioOverrides.targetIrrPercent,
    salesGrowthPercent: scenarioOverrides.salesGrowthPercent,
    priceGrowthPercent: scenarioOverrides.priceGrowthPercent,
    totalInvestment: totalInvestment,
    averageLitersPerStation: averageLitersPerStation,
    averageIRR: averageIRR,
    simplePayback: simplePayback,
    profitabilityThreshold: profitabilityThreshold
  };

  const scenarioSet = calculateScenarioSet(baseData, data);

  let marketStatus = "Low potential";
  let statusClass = "low";

  const baseProfitableShare =
    scenarioSet.baseScenario.profitableStations / data.stations;

  const targetIrrDecimal = scenarioOverrides.targetIrrPercent / 100;

  if (
    averageIRR !== null &&
    averageIRR >= targetIrrDecimal &&
    baseProfitableShare >= 0.25
  ) {
    marketStatus = "Highly attractive";
    statusClass = "high";
  } else if (
    (averageIRR !== null && averageIRR >= targetIrrDecimal * 0.8) ||
    baseProfitableShare >= 0.10
  ) {
    marketStatus = "Moderate potential";
    statusClass = "medium";
  }

  return {
    ...baseData,
    conservativeScenario: scenarioSet.conservativeScenario,
    baseScenario: scenarioSet.baseScenario,
    optimisticScenario: scenarioSet.optimisticScenario,
    rawScenarios: scenarioSet.rawScenarios,
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
    if (sortMode === "irr") {
      const irrA = a.averageIRR === null ? -999 : a.averageIRR;
      const irrB = b.averageIRR === null ? -999 : b.averageIRR;

      return irrB - irrA;
    }

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
      const paybackA =
        a.simplePayback === Infinity ? Number.MAX_VALUE : a.simplePayback;
      const paybackB =
        b.simplePayback === Infinity ? Number.MAX_VALUE : b.simplePayback;

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
    Avg. IRR: ${formatPercent(calculatedCountry.averageIRR, 1)}<br>
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
    panelIrr.textContent = "-";
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
    panelIrr.textContent = "-";
    panelPayback.textContent = "-";

    panelStatus.className = "panel-status empty-status";
    panelStatus.textContent = "No data";

    return;
  }

  const coverageBase = getCoverageBase(calculatedCountry);

  const paybackText =
    calculatedCountry.simplePayback === Infinity
      ? "Not reached"
      : `${formatDecimal(calculatedCountry.simplePayback, 1)} years`;

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
  panelIrr.textContent = formatPercent(calculatedCountry.averageIRR, 1);
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
      country.simplePayback === Infinity
        ? "Not reached"
        : `${formatDecimal(country.simplePayback, 1)} years`;

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
      <td><strong>${formatPercent(country.averageIRR, 1)}</strong></td>
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

  const irrData = sortedCountries.map(function (country) {
    return country.averageIRR === null ? 0 : Number((country.averageIRR * 100).toFixed(1));
  });

  const profitableCtx = document
    .getElementById("profitableStationsChart")
    .getContext("2d");

  const irrCtx = document
    .getElementById("averageIrrChart")
    .getContext("2d");

  if (profitableStationsChart) {
    profitableStationsChart.destroy();
  }

  if (averageIrrChart) {
    averageIrrChart.destroy();
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

  averageIrrChart = new Chart(irrCtx, {
    type: "bar",
    data: {
      labels: countryLabels,
      datasets: [
        {
          label: "Average IRR (%)",
          data: irrData,
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
              return `${formatDecimal(context.raw, 1)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return `${value}%`;
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
    "Coverage base",
    "Average IRR",
    "Simple payback"
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
      `${formatDecimal(getCoverageBase(country), 2)}%`,
      formatPercent(country.averageIRR, 1),
      country.simplePayback === Infinity
        ? "Not reached"
        : formatDecimal(country.simplePayback, 2)
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
        appliedScenarioOverrides = {
          ...DEFAULT_SCENARIO,
          ...imported.scenario
        };

        setScenarioControls(appliedScenarioOverrides, false);
        saveScenario();
      }

      saveData();
      markScenarioApplied();
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

calculateScenarioBtn.addEventListener("click", function () {
  applyScenarioChanges();
});

globalMachineCostInput.addEventListener("input", function () {
  updateMachineCostControls(globalMachineCostInput.value, true);
});

globalMachineCostSlider.addEventListener("input", function () {
  updateMachineCostControls(globalMachineCostSlider.value, true);
});

globalInstallationCostInput.addEventListener("input", function () {
  updateInstallationCostControls(globalInstallationCostInput.value, true);
});

globalInstallationCostSlider.addEventListener("input", function () {
  updateInstallationCostControls(globalInstallationCostSlider.value, true);
});

globalMaintenanceCostInput.addEventListener("input", function () {
  updateMaintenanceCostControls(globalMaintenanceCostInput.value, true);
});

globalMaintenanceCostSlider.addEventListener("input", function () {
  updateMaintenanceCostControls(globalMaintenanceCostSlider.value, true);
});

globalNetPricePercentInput.addEventListener("input", function () {
  updateNetPriceControls(globalNetPricePercentInput.value, true);
});

globalNetPricePercentSlider.addEventListener("input", function () {
  updateNetPriceControls(globalNetPricePercentSlider.value, true);
});

globalProjectLifetimeInput.addEventListener("input", function () {
  updateProjectLifetimeControls(globalProjectLifetimeInput.value, true);
});

globalProjectLifetimeSlider.addEventListener("input", function () {
  updateProjectLifetimeControls(globalProjectLifetimeSlider.value, true);
});

globalTargetIrrInput.addEventListener("input", function () {
  updateTargetIrrControls(globalTargetIrrInput.value, true);
});

globalTargetIrrSlider.addEventListener("input", function () {
  updateTargetIrrControls(globalTargetIrrSlider.value, true);
});

globalSalesGrowthInput.addEventListener("input", function () {
  updateSalesGrowthControls(globalSalesGrowthInput.value, true);
});

globalSalesGrowthSlider.addEventListener("input", function () {
  updateSalesGrowthControls(globalSalesGrowthSlider.value, true);
});

globalPriceGrowthInput.addEventListener("input", function () {
  updatePriceGrowthControls(globalPriceGrowthInput.value, true);
});

globalPriceGrowthSlider.addEventListener("input", function () {
  updatePriceGrowthControls(globalPriceGrowthSlider.value, true);
});

setScenarioControls(appliedScenarioOverrides, false);

initMap();