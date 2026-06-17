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
    forecast_days: String(days),
    current: "temperature_2m",
    daily: "temperature_2m_max",
    hourly: "temperature_2m",
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
    temperature: data.daily.temperature_2m_max[index],
  }));

  const hourly = data.hourly?.time?.map((time, index) => ({
    time,
    date: time.slice(0, 10),
    hour: Number(time.slice(11, 13)),
    temperature: data.hourly.temperature_2m[index],
  }));

  if (!daily?.length || !hourly?.length) {
    throw new Error("Forecast data did not include temperatures for SFO.");
  }

  const peakDay = daily.reduce((highest, entry) =>
    entry.temperature > highest.temperature ? entry : highest
  );

  const peakDayHours = hourly.filter((entry) => entry.date === peakDay.date);
  const peakHour = peakDayHours.reduce((highest, entry) =>
    entry.temperature > highest.temperature ? entry : highest
  );

  return {
    current: data.current?.temperature_2m,
    currentTime: data.current?.time,
    daily,
    hourly: peakDayHours,
    peakDay,
    peakHour,
  };
}

function renderForecast(summary) {
  document.querySelector("#peak-temperature").textContent = formatTemperature(
    summary.peakDay.temperature
  );
  document.querySelector("#peak-detail").textContent =
    `${formatFullDate(summary.peakDay.date)} near ${formatHour(summary.peakHour.hour)}.`;
  document.querySelector("#current-temperature").textContent =
    summary.current === undefined ? "--" : formatTemperature(summary.current);
  document.querySelector("#updated-at").textContent =
    summary.currentTime === undefined
      ? "Current reading unavailable"
      : `Updated ${formatDateTime(summary.currentTime)}`;
  document.querySelector("#daily-range").textContent =
    `${summary.daily.length} day forecast`;
  document.querySelector("#hourly-date").textContent =
    formatFullDate(summary.peakDay.date);

  renderDailyList(summary.daily, summary.peakDay.date);
  renderHourlyChart(summary.hourly, summary.peakHour.time);
}

function renderDailyList(days, peakDate) {
  const list = document.querySelector("#daily-list");
  list.replaceChildren();

  days.forEach((day) => {
    const article = document.createElement("article");
    article.className = `day-card${day.date === peakDate ? " is-peak" : ""}`;

    const name = document.createElement("p");
    name.className = "day-name";
    name.textContent = formatWeekday(day.date);

    const date = document.createElement("p");
    date.className = "day-date";
    date.textContent = formatShortDate(day.date);

    const temp = document.createElement("p");
    temp.className = "day-temp";
    temp.textContent = formatTemperature(day.temperature);

    article.append(name, date, temp);
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
}

function formatTemperature(value) {
  return `${Math.round(value)}${tempUnit}`;
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
