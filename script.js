// 使用 Open-Meteo 免费 API（无需 key）
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const locateBtn = document.getElementById("locate-btn");
const suggestionsEl = document.getElementById("suggestions");
const currentEl = document.getElementById("current");
const forecastEl = document.getElementById("forecast");
const errorEl = document.getElementById("error");
const loadingEl = document.getElementById("loading");

// 天气代码 -> 图标与中文描述
const WEATHER_CODES = {
  0: { icon: "☀️", desc: "晴" },
  1: { icon: "🌤️", desc: "大部晴朗" },
  2: { icon: "⛅", desc: "多云" },
  3: { icon: "☁️", desc: "阴" },
  45: { icon: "🌫️", desc: "雾" },
  48: { icon: "🌫️", desc: "雾凇" },
  51: { icon: "🌦️", desc: "小毛毛雨" },
  53: { icon: "🌦️", desc: "毛毛雨" },
  55: { icon: "🌧️", desc: "大毛毛雨" },
  56: { icon: "🌧️", desc: "冻毛毛雨" },
  57: { icon: "🌧️", desc: "冻毛毛雨" },
  61: { icon: "🌦️", desc: "小雨" },
  63: { icon: "🌧️", desc: "中雨" },
  65: { icon: "🌧️", desc: "大雨" },
  66: { icon: "🌧️", desc: "冻雨" },
  67: { icon: "🌧️", desc: "冻雨" },
  71: { icon: "🌨️", desc: "小雪" },
  73: { icon: "🌨️", desc: "中雪" },
  75: { icon: "❄️", desc: "大雪" },
  77: { icon: "❄️", desc: "雪粒" },
  80: { icon: "🌦️", desc: "阵雨" },
  81: { icon: "🌧️", desc: "阵雨" },
  82: { icon: "⛈️", desc: "强阵雨" },
  85: { icon: "🌨️", desc: "阵雪" },
  86: { icon: "❄️", desc: "强阵雪" },
  95: { icon: "⛈️", desc: "雷暴" },
  96: { icon: "⛈️", desc: "雷暴伴冰雹" },
  99: { icon: "⛈️", desc: "强雷暴伴冰雹" },
};

function weatherInfo(code) {
  return WEATHER_CODES[code] || { icon: "🌡️", desc: "未知" };
}

function showLoading() {
  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
}

function hideLoading() {
  loadingEl.classList.add("hidden");
}

function showError(msg) {
  hideLoading();
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

// 通过城市名获取坐标
async function geocode(name) {
  const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(name)}&count=5&language=zh&format=json`);
  if (!res.ok) throw new Error("定位失败");
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("未找到该城市，请换个名称试试");
  }
  return data.results;
}

// 获取天气数据
async function fetchWeather(lat, lon, locationName) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "7",
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error("获取天气失败");
  const data = await res.json();
  renderCurrent(data.current, locationName);
  renderForecast(data.daily);
}

function renderCurrent(c, locationName) {
  const info = weatherInfo(c.weather_code);
  document.getElementById("current-location").textContent = locationName;
  document.getElementById("current-temp").textContent = Math.round(c.temperature_2m);
  document.getElementById("current-icon").textContent = info.icon;
  document.getElementById("current-desc").textContent = info.desc;
  document.getElementById("feels-like").textContent = `${Math.round(c.apparent_temperature)}°C`;
  document.getElementById("humidity").textContent = `${c.relative_humidity_2m}%`;
  document.getElementById("wind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  document.getElementById("pressure").textContent = `${Math.round(c.surface_pressure)} hPa`;
  currentEl.classList.remove("hidden");
}

function renderForecast(daily) {
  const list = document.getElementById("forecast-list");
  list.innerHTML = "";
  const days = ["日", "一", "二", "三", "四", "五", "六"];

  daily.time.forEach((date, i) => {
    const d = new Date(date + "T00:00:00");
    const label = i === 0 ? "今天" : `周${days[d.getDay()]}`;
    const info = weatherInfo(daily.weather_code[i]);

    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
      <div class="day">${label}</div>
      <div class="icon">${info.icon}</div>
      <div class="hi">${Math.round(daily.temperature_2m_max[i])}°</div>
      <div class="lo">${Math.round(daily.temperature_2m_min[i])}°</div>
    `;
    list.appendChild(item);
  });
  forecastEl.classList.remove("hidden");
}

async function searchCity(name) {
  showLoading();
  suggestionsEl.classList.add("hidden");
  try {
    const results = await geocode(name);
    const top = results[0];
    await fetchWeather(top.latitude, top.longitude, `${top.name}${top.country ? " · " + top.country : ""}`);
    hideLoading();
  } catch (e) {
    showError(e.message);
  }
}

searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (q) searchCity(q);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    if (q) searchCity(q);
  }
});

// 输入时展示城市联想
let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (!q) {
    suggestionsEl.classList.add("hidden");
    return;
  }
  debounceTimer = setTimeout(async () => {
    try {
      const results = await geocode(q);
      suggestionsEl.innerHTML = "";
      results.forEach((r) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = `${r.name}${r.admin1 ? " · " + r.admin1 : ""}${r.country ? " · " + r.country : ""}`;
        item.addEventListener("click", async () => {
          suggestionsEl.classList.add("hidden");
          searchInput.value = r.name;
          showLoading();
          try {
            await fetchWeather(r.latitude, r.longitude, `${r.name}${r.country ? " · " + r.country : ""}`);
          } catch (e) {
            showError(e.message);
          }
          hideLoading();
        });
        suggestionsEl.appendChild(item);
      });
      suggestionsEl.classList.remove("hidden");
    } catch (e) {
      suggestionsEl.classList.add("hidden");
    }
  }, 300);
});

// 使用浏览器定位
locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("当前浏览器不支持定位");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        await fetchWeather(latitude, longitude, "我的位置");
      } catch (e) {
        showError(e.message);
      }
      hideLoading();
    },
    () => {
      showError("定位失败，请手动输入城市名");
    }
  );
});
