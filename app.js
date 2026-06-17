const SFO = {
  latitude: 37.6213,
  longitude: -122.379,
  timezone: "America/Los_Angeles",
};

const tempUnit = "\u00B0F";

const state = {
  days: 7,
  loading: false,
};

const weatherDescriptions = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#weather-form");
  const rangeSelect = document.querySelector("#forecast-range");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.days = Number(rangeSelect.value);
    loadForecast();
  });

  loadForecast();
});

async function loadForecast() {
  const button = document.querySelector(".primary-button");
  const errorBox = document.querySelector("#error-box");
  state.loading = true;
  button.disabled = true;
  button.querySelector("span").textContent = "Checking";
  errorBox.hidden = true;

  try {
    const data = await fetchForecast(state.days);
    const summary = summarizeForecast(data);
    renderForecast(summary);
  } catch (error) {
    showError(error);
  } finally {
    state.loading = false;
    button.disabled = false;
    button.querySelector("span").textContent = "Find highest";
  }
}

async function fetchForecast(days) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: SFO.latitude,
    longitude: SFO.longitude,
    timezone: SFO.timezone,
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    forecast_days: String(days),
    current: "temperature_2m,wind_speed_10m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min",
    hourly: "temperature_2m,apparent_temperature",
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather service returned an unexpected response.");
  }

  return response.json();
}

function summarizeForecast(data) {
  const daily = data.daily?.time?.map((date, index) => ({
    date,
    high: data.daily.temperature_2m_max[index],
    low: data.daily.temperature_2m_min[index],
  }));

  const hourly = data.hourly?.time?.map((time, index) => ({
    time,
    date: time.slice(0, 10),
    hour: Number(time.slice(11, 13)),
    temperature: data.hourly.temperature_2m[index],
    apparent: data.hourly.apparent_temperature?.[index],
  }));

  if (!daily?.length || !hourly?.length) {
    throw new Error("Forecast data did not include temperatures for SFO.");
  }

  const peakDay = daily.reduce((highest, entry) =>
    entry.high > highest.high ? entry : highest
  );

  const peakDayHours = hourly.filter((entry) => entry.date === peakDay.date);
  const peakHour = peakDayHours.reduce((highest, entry) =>
    entry.temperature > highest.temperature ? entry : highest
  );
  const averageHigh =
    daily.reduce((total, entry) => total + entry.high, 0) / daily.length;
  const coolestDay = daily.reduce((coolest, entry) =>
    entry.high < coolest.high ? entry : coolest
  );

  return {
    current: data.current?.temperature_2m,
    currentTime: data.current?.time,
    currentWind: data.current?.wind_speed_10m,
    currentWeatherCode: data.current?.weather_code,
    daily,
    hourly: peakDayHours,
    averageHigh,
    coolestDay,
    peakDay,
    peakHour,
  };
}

function renderForecast(summary) {
  document.querySelector("#peak-temperature").textContent = formatTemperature(
    summary.peakDay.high
  );
  document.querySelector("#peak-detail").textContent =
    `${formatFullDate(summary.peakDay.date)} near ${formatHour(summary.peakHour.hour)}, with a low around ${formatTemperature(summary.peakDay.low)}.`;
  document.querySelector("#current-temperature").textContent =
    summary.current === undefined ? "--" : formatTemperature(summary.current);
  document.querySelector("#updated-at").textContent =
    summary.currentTime === undefined
      ? "Current reading unavailable"
      : `Updated ${formatDateTime(summary.currentTime)}`;
  document.querySelector("#current-wind").textContent =
    summary.currentWind === undefined ? "--" : `${Math.round(summary.currentWind)} mph`;
  document.querySelector("#current-condition").textContent =
    weatherDescriptions[summary.currentWeatherCode] || "Forecast";
  document.querySelector("#average-high").textContent = formatTemperature(
    summary.averageHigh
  );
  document.querySelector("#coolest-high").textContent =
    `${formatTemperature(summary.coolestDay.high)} ${formatWeekday(summary.coolestDay.date)}`;
  document.querySelector("#peak-hour-stat").textContent =
    `${formatHour(summary.peakHour.hour)} ${formatTemperature(summary.peakHour.temperature)}`;
  document.querySelector("#peak-delta").textContent = formatPeakDelta(
    summary.peakDay.high,
    summary.averageHigh
  );
  document.querySelector("#daily-range").textContent =
    `${summary.daily.length} day forecast`;
  document.querySelector("#hourly-date").textContent =
    formatFullDate(summary.peakDay.date);
  document.querySelector("#chart-note").textContent =
    `${formatTemperature(summary.peakHour.temperature)} peak reading; feels like ${formatTemperature(summary.peakHour.apparent ?? summary.peakHour.temperature)}.`;
  document.querySelector("#hero-weather-line").textContent =
    `SFO is ${formatTemperature(summary.current ?? summary.peakHour.temperature)} now. Peak forecast: ${formatTemperature(summary.peakDay.high)}.`;
  document.querySelector("#source-line").textContent =
    `Open-Meteo updated ${formatDateTime(summary.currentTime || summary.peakHour.time)} for SFO coordinates`;

  renderDailyList(summary.daily, summary.peakDay.date);
  renderHourlyChart(summary.hourly, summary.peakHour.time);
}

function renderDailyList(days, peakDate) {
  const list = document.querySelector("#daily-list");
  list.replaceChildren();
  const minHigh = Math.min(...days.map((day) => day.high));
  const maxHigh = Math.max(...days.map((day) => day.high));
  const range = Math.max(maxHigh - minHigh, 1);

  days.forEach((day) => {
    const article = document.createElement("article");
    article.className = `day-card${day.date === peakDate ? " is-peak" : ""}`;
    const heatFill = 18 + Math.round(((day.high - minHigh) / range) * 38);
    article.style.setProperty("--heat-fill", `${heatFill}%`);
    article.setAttribute(
      "aria-label",
      `${formatWeekday(day.date)} high ${formatTemperature(day.high)}, low ${formatTemperature(day.low)}`
    );

    const name = document.createElement("p");
    name.className = "day-name";
    name.textContent = formatWeekday(day.date);

    const date = document.createElement("p");
    date.className = "day-date";
    date.textContent = formatShortDate(day.date);

    const temps = document.createElement("div");
    temps.className = "day-temps";

    const high = document.createElement("p");
    high.className = "day-temp";
    high.textContent = formatTemperature(day.high);

    const low = document.createElement("p");
    low.className = "day-low";
    low.textContent = `Low ${formatTemperature(day.low)}`;

    temps.append(high, low);
    article.append(name, date, temps);
    list.append(article);
  });
}

function renderHourlyChart(hours, peakTime) {
  const chart = document.querySelector("#hourly-chart");
  chart.replaceChildren();

  const temperatures = hours.map((entry) => entry.temperature);
  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const range = Math.max(max - min, 1);

  hours.forEach((entry) => {
    const bar = document.createElement("button");
    const height = 18 + ((entry.temperature - min) / range) * 150;
    bar.type = "button";
    bar.className = `hourly-bar${entry.time === peakTime ? " is-peak" : ""}`;
    bar.style.setProperty("--bar-height", `${height}px`);
    bar.setAttribute(
      "aria-label",
      `${formatHour(entry.hour)} ${formatTemperature(entry.temperature)}`
    );

    const label = document.createElement("span");
    label.textContent = `${formatHour(entry.hour)} ${formatTemperature(entry.temperature)}`;
    bar.append(label);
    chart.append(bar);
  });
}

function showError(error) {
  const errorBox = document.querySelector("#error-box");
  errorBox.textContent =
    error.message || "Could not load the SFO forecast. Please try again.";
  errorBox.hidden = false;
  document.querySelector("#peak-detail").textContent =
    "Forecast unavailable right now.";
  document.querySelector("#hero-weather-line").textContent =
    "San Francisco International Airport (SFO)";
}

function formatTemperature(value) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)}${tempUnit}`;
}

function formatPeakDelta(peakHigh, averageHigh) {
  const delta = Math.round(peakHigh - averageHigh);

  if (delta === 0) {
    return "Matches the forecast average high";
  }

  return `${Math.abs(delta)}${tempUnit} ${delta > 0 ? "above" : "below"} the forecast average high`;
}

function formatFullDate(dateString) {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(dateString) {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatWeekday(dateString) {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDateTime(timeString) {
  const [datePart, hourPart] = timeString.split("T");
  const hour = Number(hourPart.slice(0, 2));
  return `${formatShortDate(datePart)}, ${formatHour(hour)}`;
}

function formatHour(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${suffix}`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}
