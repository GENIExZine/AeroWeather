/**
 * AeroWeather - Live Real-Time Weather Application
 * Built with Open-Meteo API, Wikipedia/Wikimedia City Photos, Leaflet.js & RainViewer Radar
 */

// Default Fallback Datasets for Instant Display & Offline Resilience
const DEFAULT_WEATHER_DATA = {
  current: {
    temperature_2m: 24,
    relative_humidity_2m: 45,
    apparent_temperature: 24,
    is_day: 1,
    precipitation: 0,
    rain: 0,
    showers: 0,
    snowfall: 0,
    weather_code: 0,
    cloud_cover: 15,
    surface_pressure: 1013,
    wind_speed_10m: 12,
    wind_direction_10m: 180
  },
  hourly: {
    time: Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() + i, 0, 0, 0);
      return d.toISOString();
    }),
    temperature_2m: [24, 24, 23, 22, 21, 20, 19, 19, 21, 23, 25, 26, 26, 25, 24, 23, 22, 21, 20, 20, 19, 19, 18, 18],
    relative_humidity_2m: [45, 48, 52, 58, 62, 65, 68, 70, 62, 55, 48, 45, 42, 46, 50, 56, 60, 64, 68, 70, 72, 74, 75, 76],
    precipitation_probability: [10, 5, 0, 0, 0, 0, 0, 0, 5, 10, 15, 20, 15, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    weather_code: [0, 0, 0, 1, 1, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    uv_index: [0, 0, 0, 0, 0, 1, 3, 5, 7, 8, 7, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    is_day: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]
  },
  daily: {
    time: Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    }),
    weather_code: [0, 1, 2, 61, 1, 0, 2],
    temperature_2m_max: [26, 27, 25, 22, 24, 26, 25],
    temperature_2m_min: [18, 19, 17, 16, 15, 17, 18],
    apparent_temperature_max: [27, 28, 26, 22, 24, 27, 26],
    apparent_temperature_min: [18, 19, 17, 16, 15, 17, 18],
    sunrise: [new Date().toISOString()],
    sunset: [new Date().toISOString()],
    precipitation_sum: [0, 0, 1.2, 4.8, 0, 0, 0.4],
    precipitation_probability_max: [10, 15, 35, 70, 20, 10, 25],
    wind_speed_10m_max: [12, 14, 18, 22, 12, 10, 15]
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'
};

const DEFAULT_AQI_DATA = {
  current: {
    us_aqi: 42,
    european_aqi: 25,
    pm2_5: 9.8,
    pm10: 16.4,
    ozone: 32.1,
    carbon_monoxide: 220,
    nitrogen_dioxide: 12.4,
    sulphur_dioxide: 3.2
  }
};

// Application State
const state = {
  currentCity: {
    name: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    admin1: 'Ontario',
    lat: 43.6532,
    lon: -79.3832,
    timezone: 'America/Toronto',
    photoUrl: 'assets/toronto.jpg'
  },
  weatherData: DEFAULT_WEATHER_DATA,
  airQualityData: DEFAULT_AQI_DATA,
  unit: localStorage.getItem('aeroweather_unit') || 'C', // 'C' or 'F'
  windUnit: localStorage.getItem('aeroweather_wind_unit') || 'kmh', // 'kmh' or 'mph'
  currentTab: 'dashboard', // 'dashboard', 'maps', 'radar'
  favorites: JSON.parse(localStorage.getItem('aeroweather_favorites') || '[]'),
  weatherMap: null,
  weatherMarker: null,
  weatherBaseLayers: [],
  radarMap: null,
  radarMarker: null,
  radarBaseLayers: [],
  mapStyle: (localStorage.getItem('aeroweather_map_style') === 'globe3d' ? 'satellite' : (localStorage.getItem('aeroweather_map_style') || 'satellite')), // 'satellite', 'dark', 'streets'
  radarLayers: [],
  radarTimestamps: [],
  radarCurrentIndex: 0,
  radarInterval: null,
  isRadarPlaying: false
};

// Curated High-Res City Photos for Instant Zero-Latency Loading
const PRESET_CITY_PHOTOS = {
  'toronto': 'assets/toronto.jpg',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1600&q=80',
  'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=80',
  'tokyo': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80',
  'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80',
  'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=80',
  'sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1600&q=80',
  'singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1600&q=80',
  'mumbai': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1600&q=80',
  'los angeles': 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?auto=format&fit=crop&w=1600&q=80',
  'san francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80',
  'berlin': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1600&q=80',
  'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80',
  'chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=1600&q=80',
  'vancouver': 'https://images.unsplash.com/photo-1559511260-66a65e0982d5?auto=format&fit=crop&w=1600&q=80',
  'amsterdam': 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1600&q=80',
  'hong kong': 'https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=1600&q=80',
  'barcelona': 'https://images.unsplash.com/photo-1583422409516-291507462b8b?auto=format&fit=crop&w=1600&q=80',
  'seoul': 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1600&q=80',
  'shanghai': 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?auto=format&fit=crop&w=1600&q=80',
  'cairo': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1600&q=80',
  'rio de janeiro': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1600&q=80',
  'rainbow sky': 'assets/rainbow_sky_bg.jpg'
};

// Weather condition atmospheric fallbacks
const WEATHER_BACKDROPS = {
  sunny: 'https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd?auto=format&fit=crop&w=1600&q=80',
  cloudy: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1600&q=80',
  rainy: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1600&q=80',
  snow: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=1600&q=80',
  thunder: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1600&q=80',
  night: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
  rainbow: 'assets/rainbow_sky_bg.jpg'
};

// WMO Weather Code Dictionary with Dynamic 3D Live Atmosphere Imagery
const WMO_CODES = {
  0: { label: 'Clear Sky', icon: 'sunny', nightIcon: 'clear_night', type: 'clear', icon3d: 'assets/weather_sunny.jpg' },
  1: { label: 'Mainly Clear', icon: 'partly_cloudy_day', nightIcon: 'partly_cloudy_night', type: 'clear', icon3d: 'assets/weather_sunny.jpg' },
  2: { label: 'Partly Cloudy', icon: 'partly_cloudy_day', nightIcon: 'partly_cloudy_night', type: 'cloudy', icon3d: 'assets/weather_overcast.jpg' },
  3: { label: 'Overcast', icon: 'cloud', nightIcon: 'cloud', type: 'cloudy', icon3d: 'assets/weather_overcast.jpg' },
  45: { label: 'Fog', icon: 'foggy', nightIcon: 'foggy', type: 'fog', icon3d: 'assets/weather_fog.jpg' },
  48: { label: 'Depositing Rime Fog', icon: 'foggy', nightIcon: 'foggy', type: 'fog', icon3d: 'assets/weather_fog.jpg' },
  51: { label: 'Light Drizzle', icon: 'rainy_light', nightIcon: 'rainy_light', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  53: { label: 'Moderate Drizzle', icon: 'rainy', nightIcon: 'rainy', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  55: { label: 'Dense Drizzle', icon: 'rainy_heavy', nightIcon: 'rainy_heavy', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  56: { label: 'Freezing Drizzle', icon: 'weather_snowy', nightIcon: 'weather_snowy', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  57: { label: 'Dense Freezing Drizzle', icon: 'weather_snowy', nightIcon: 'weather_snowy', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  61: { label: 'Slight Rain', icon: 'rainy', nightIcon: 'rainy', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  63: { label: 'Moderate Rain', icon: 'rainy', nightIcon: 'rainy', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  65: { label: 'Heavy Rain', icon: 'rainy_heavy', nightIcon: 'rainy_heavy', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  66: { label: 'Light Freezing Rain', icon: 'weather_mix', nightIcon: 'weather_mix', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  67: { label: 'Heavy Freezing Rain', icon: 'weather_mix', nightIcon: 'weather_mix', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  71: { label: 'Slight Snow Fall', icon: 'ac_unit', nightIcon: 'ac_unit', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  73: { label: 'Moderate Snow Fall', icon: 'weather_snowy', nightIcon: 'weather_snowy', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  75: { label: 'Heavy Snow Fall', icon: 'severe_cold', nightIcon: 'severe_cold', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  77: { label: 'Snow Grains', icon: 'grain', nightIcon: 'grain', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  80: { label: 'Slight Rain Showers', icon: 'rainy', nightIcon: 'rainy', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  81: { label: 'Moderate Rain Showers', icon: 'rainy', nightIcon: 'rainy', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  82: { label: 'Violent Rain Showers', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'rainy', icon3d: 'assets/weather_rain.jpg' },
  85: { label: 'Slight Snow Showers', icon: 'weather_snowy', nightIcon: 'weather_snowy', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  86: { label: 'Heavy Snow Showers', icon: 'severe_cold', nightIcon: 'severe_cold', type: 'snow', icon3d: 'assets/weather_snow.jpg' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'thunder', icon3d: 'assets/weather_thunder.jpg' },
  96: { label: 'Thunderstorm with Slight Hail', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'thunder', icon3d: 'assets/weather_thunder.jpg' },
  99: { label: 'Thunderstorm with Heavy Hail', icon: 'thunderstorm', nightIcon: 'thunderstorm', type: 'thunder', icon3d: 'assets/weather_thunder.jpg' }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initSearchAutocomplete('desktop-search-input', 'desktop-search-dropdown');
  initSearchAutocomplete('mobile-search-input', 'mobile-search-dropdown');
  initSearchAutocomplete('map-search-input', 'map-search-dropdown');
  
  // Initialize map style UI
  updateMapStyleButtonsUI();

  // Check for cached weather data for instant zero-latency display
  try {
    const cachedWeather = localStorage.getItem('aeroweather_cached_weather');
    const cachedAqi = localStorage.getItem('aeroweather_cached_aqi');
    if (cachedWeather) {
      state.weatherData = JSON.parse(cachedWeather);
    }
    if (cachedAqi) {
      state.airQualityData = JSON.parse(cachedAqi);
    }
  } catch (e) {
    console.warn('Cache parse error:', e);
  }

  // Initial instant render so the screen is never blank on mobile or desktop
  renderHeroCard();
  renderSidebarBento();
  renderHourlyForecast();
  renderDailyForecast();
  renderExtraAnalytics();
  updateFavoriteIcon();

  // Load initial city live data (Toronto or saved last city)
  const savedCity = localStorage.getItem('aeroweather_last_city');
  if (savedCity) {
    try {
      const parsed = JSON.parse(savedCity);
      fetchCityWeather(parsed);
    } catch (e) {
      fetchCityWeather(state.currentCity);
    }
  } else {
    fetchCityWeather(state.currentCity);
  }
});

/**
 * Event Listeners & Global Handlers
 */
function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll('[data-nav-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = tab.getAttribute('data-nav-tab');
      switchTab(targetTab);
    });
  });

  // Unit toggle buttons
  const unitBtn = document.getElementById('unit-toggle-btn');
  if (unitBtn) {
    unitBtn.addEventListener('click', toggleTemperatureUnit);
  }
  const unitSettingsBtn = document.getElementById('settings-unit-toggle');
  if (unitSettingsBtn) {
    unitSettingsBtn.addEventListener('click', toggleTemperatureUnit);
  }

  // Geolocation button
  const geoBtn = document.getElementById('geo-btn');
  if (geoBtn) {
    geoBtn.addEventListener('click', locateUser);
  }

  // Settings modal
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
      settingsModal.classList.add('flex');
    });
  }
  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
      settingsModal.classList.remove('flex');
    });
  }

  // Quick preset city chips
  document.querySelectorAll('[data-city-preset]').forEach(chip => {
    chip.addEventListener('click', () => {
      const cityKey = chip.getAttribute('data-city-preset');
      handlePresetCityClick(cityKey);
    });
  });

  // Favorite toggle button
  const favBtn = document.getElementById('favorite-toggle-btn');
  if (favBtn) {
    favBtn.addEventListener('click', toggleFavoriteCity);
  }

  // Refresh button
  const refreshBtn = document.getElementById('refresh-weather-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchCityWeather(state.currentCity);
    });
  }
}

/**
 * Switch Navigation Tab (Dashboard / Maps / Radar)
 */
function switchTab(tabName) {
  state.currentTab = tabName;

  // Update active styling on nav links
  document.querySelectorAll('[data-nav-tab]').forEach(el => {
    const isTarget = el.getAttribute('data-nav-tab') === tabName;
    if (isTarget) {
      el.classList.remove('text-on-surface-variant');
      el.classList.add('text-primary', 'border-b-2', 'border-primary', 'font-bold');
      const icon = el.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = "'FILL' 1";
    } else {
      el.classList.remove('text-primary', 'border-b-2', 'border-primary', 'font-bold');
      el.classList.add('text-on-surface-variant');
      const icon = el.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = "'FILL' 0";
    }
  });

  const dashboardView = document.getElementById('dashboard-view');
  const mapsView = document.getElementById('maps-view');
  const radarView = document.getElementById('radar-view');

  if (tabName === 'dashboard') {
    dashboardView.classList.remove('hidden');
    mapsView.classList.add('hidden');
    radarView.classList.add('hidden');
  } else if (tabName === 'maps') {
    dashboardView.classList.add('hidden');
    mapsView.classList.remove('hidden');
    radarView.classList.add('hidden');
    setTimeout(() => {
      initOrUpdateWeatherMap();
      updateMapStyleButtonsUI();
    }, 40);
  } else if (tabName === 'radar') {
    dashboardView.classList.add('hidden');
    mapsView.classList.add('hidden');
    radarView.classList.remove('hidden');
    setTimeout(() => {
      initOrUpdateRadarMap();
      updateMapStyleButtonsUI();
    }, 40);
  }
}

/**
 * Fetch Full Weather & Air Quality for a City
 */
async function fetchCityWeather(cityObj) {
  showLoadingState(true);
  try {
    state.currentCity = { ...cityObj };
    try {
      localStorage.setItem('aeroweather_last_city', JSON.stringify(cityObj));
    } catch (e) {}

    // Resolve City Photo in parallel
    const photoPromise = fetchCityPhoto(cityObj.name, cityObj.country, cityObj.admin1);

    // Weather Forecast API with timeout (6500ms)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${cityObj.lat}&longitude=${cityObj.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    // Air Quality API
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${cityObj.lat}&longitude=${cityObj.lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;

    const [weatherRes, aqiRes, photoUrl] = await Promise.all([
      fetch(weatherUrl, { signal: controller.signal }).then(r => r.json()).catch(err => {
        console.warn('Weather fetch failed, using fallback:', err);
        return null;
      }),
      fetch(aqiUrl, { signal: controller.signal }).then(r => r.json()).catch(() => null),
      photoPromise
    ]);
    clearTimeout(timeoutId);

    // If live weather data is valid, update and cache
    if (weatherRes && weatherRes.current) {
      state.weatherData = weatherRes;
      try {
        localStorage.setItem('aeroweather_cached_weather', JSON.stringify(weatherRes));
      } catch (e) {}
    } else if (!state.weatherData) {
      state.weatherData = DEFAULT_WEATHER_DATA;
    }

    // If live air quality data is valid, update and cache
    if (aqiRes && aqiRes.current) {
      state.airQualityData = aqiRes;
      try {
        localStorage.setItem('aeroweather_cached_aqi', JSON.stringify(aqiRes));
      } catch (e) {}
    } else if (!state.airQualityData) {
      state.airQualityData = DEFAULT_AQI_DATA;
    }

    if (photoUrl) {
      state.currentCity.photoUrl = photoUrl;
    }

    // Render UI immediately
    renderHeroCard();
    renderSidebarBento();
    renderHourlyForecast();
    renderDailyForecast();
    renderExtraAnalytics();
    updateFavoriteIcon();

    // Trigger 3D Earth Cinematic Flight Animation & Map Updates
    const currentTemp = state.weatherData && state.weatherData.current ? state.weatherData.current.temperature_2m : 24;
    const tempStr = formatTemp(currentTemp);
    const regionStr = cityObj.admin1 ? `${cityObj.admin1}, ` : '';
    performCinematic3DEarthFlight(cityObj.lat, cityObj.lon, cityObj.name, tempStr, regionStr);

    if (state.radarMap) {
      state.radarMap.flyTo([cityObj.lat, cityObj.lon], 9, { duration: 1.5 });
      if (state.radarMarker) {
        state.radarMarker.setLatLng([cityObj.lat, cityObj.lon]);
        state.radarMarker.bindPopup(`
          <div style="font-family: inherit; padding: 2px;">
            <div style="font-size: 14px; font-weight: bold; color: #a4c9ff; margin-bottom: 2px;">${escapeHtml(cityObj.name)}</div>
            <div style="font-size: 18px; font-weight: 800; color: #ffffff;">${tempStr}</div>
          </div>
        `).openPopup();
      }
    }

  } catch (err) {
    console.error('Error fetching weather:', err);
    // Ensure the interface still displays cleanly with fallback data
    renderHeroCard();
    renderSidebarBento();
    renderHourlyForecast();
    renderDailyForecast();
    renderExtraAnalytics();
    showToast('Operating in offline mode. Displaying latest forecast.', 'info');
  } finally {
    showLoadingState(false);
  }
}

/**
 * Dynamic City Photo Resolver with Multi-Tier Fallbacks
 */
async function fetchCityPhoto(cityName, countryName = '', admin1 = '') {
  const normCity = cityName.trim().toLowerCase();

  // 1. Check local preset
  if (PRESET_CITY_PHOTOS[normCity]) {
    return PRESET_CITY_PHOTOS[normCity];
  }

  // 2. Query Wikipedia API by exact title
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cityName)}&prop=pageimages&format=json&pithumbsize=1600&origin=*`;
    const res = await fetch(wikiUrl);
    const data = await res.json();
    if (data.query && data.query.pages) {
      const pageId = Object.keys(data.query.pages)[0];
      if (pageId !== '-1' && data.query.pages[pageId].thumbnail) {
        return data.query.pages[pageId].thumbnail.source;
      }
    }
  } catch (e) {
    console.warn('Wikipedia direct query failed:', e);
  }

  // 3. Query Wikipedia search generator (City + skyline)
  try {
    const query = `${cityName} ${countryName} skyline`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&pithumbsize=1600&format=json&origin=*`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (data.query && data.query.pages) {
      const pageId = Object.keys(data.query.pages)[0];
      if (data.query.pages[pageId].thumbnail) {
        return data.query.pages[pageId].thumbnail.source;
      }
    }
  } catch (e) {
    console.warn('Wikipedia search generator failed:', e);
  }

  // 4. Fallback to atmospheric cityscape
  return WEATHER_BACKDROPS.sunny;
}

/**
 * Render Main Hero Section (City Backdrop, Live Temp, Condition, Wind, Humidity)
 */
function renderHeroCard() {
  const weather = state.weatherData;
  if (!weather || !weather.current) return;

  const current = weather.current;
  const daily = weather.daily;
  const wmo = WMO_CODES[current.weather_code] || { label: 'Partly Cloudy', icon: 'partly_cloudy_day', type: 'cloudy' };
  const isDay = current.is_day === 1;

  // City Name & Region
  const locationEl = document.getElementById('hero-location-text');
  if (locationEl) {
    const region = state.currentCity.admin1 ? `${state.currentCity.admin1}, ` : '';
    locationEl.innerHTML = `<span class="material-symbols-outlined text-2xl text-primary flex-shrink-0">location_on</span><span>${escapeHtml(state.currentCity.name)}, ${escapeHtml(region)}${escapeHtml(state.currentCity.country)}</span>`;
  }

  // Dynamic Day/Night Sea-of-Clouds Rainbow Backdrop Animation
  const rainbowBackdrop = document.getElementById('rainbow-sky-backdrop');
  if (rainbowBackdrop) {
    if (isDay) {
      rainbowBackdrop.classList.remove('is-night');
    } else {
      rainbowBackdrop.classList.add('is-night');
    }
  }

  // Smooth Preloaded Background Photo (No blanking/flashing on refresh)
  const bgImg = document.getElementById('hero-city-bg');
  if (bgImg && state.currentCity.photoUrl) {
    const targetUrl = state.currentCity.photoUrl;
    if (bgImg.getAttribute('data-loaded-src') !== targetUrl) {
      const imgLoader = new Image();
      imgLoader.onload = () => {
        bgImg.src = targetUrl;
        bgImg.setAttribute('data-loaded-src', targetUrl);
        bgImg.alt = `${state.currentCity.name} skyline city view`;
      };
      imgLoader.onerror = () => {
        // Keep current view or use fallback
        if (!bgImg.src || bgImg.src.includes('error')) {
          bgImg.src = 'assets/toronto.jpg';
        }
      };
      imgLoader.src = targetUrl;
    }
  }

  // Temperature
  const tempEl = document.getElementById('hero-temperature');
  if (tempEl) {
    tempEl.textContent = formatTemp(current.temperature_2m);
  }

  // Condition Label
  const conditionEl = document.getElementById('hero-condition-text');
  if (conditionEl) {
    conditionEl.textContent = wmo.label;
  }

  // High & Low
  const hiLoEl = document.getElementById('hero-hilo-text');
  if (hiLoEl && daily) {
    const high = formatTemp(daily.temperature_2m_max[0]);
    const low = formatTemp(daily.temperature_2m_min[0]);
    const feels = formatTemp(current.apparent_temperature);
    hiLoEl.textContent = `H: ${high} L: ${low} • Feels like ${feels}`;
  }

  // Wind Speed
  const windEl = document.getElementById('hero-wind-value');
  if (windEl) {
    windEl.textContent = formatWind(current.wind_speed_10m);
  }

  // Humidity
  const humidityEl = document.getElementById('hero-humidity-value');
  if (humidityEl) {
    humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  }

  // Local Time
  const timeEl = document.getElementById('hero-local-time');
  if (timeEl && weather.timezone) {
    try {
      const now = new Date();
      const localTimeString = new Intl.DateTimeFormat('en-US', {
        timeZone: weather.timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        weekday: 'short'
      }).format(now);
      timeEl.textContent = `Local: ${localTimeString}`;
    } catch (e) {
      timeEl.textContent = '';
    }
  }
}

/**
 * Render Sidebar Bento (3D Weather Card, Precipitation %, Air Quality AQI)
 */
function renderSidebarBento() {
  const weather = state.weatherData;
  if (!weather || !weather.current) return;

  const current = weather.current;
  const daily = weather.daily;
  const wmo = WMO_CODES[current.weather_code] || { label: 'Clear Skies', icon: 'sunny', type: 'clear', icon3d: 'assets/weather_sunny.jpg' };

  // 3D Weather Atmosphere Live Photo Highlight (Dynamic Condition Imagery)
  const icon3dEl = document.getElementById('sidebar-3d-icon');
  const condition3dEl = document.getElementById('sidebar-condition-title');
  if (icon3dEl) {
    icon3dEl.onerror = function() {
      this.onerror = null;
      this.src = 'assets/weather_overcast.jpg';
    };
    icon3dEl.src = wmo.icon3d || 'assets/weather_overcast.jpg';
    icon3dEl.alt = `${wmo.label} Live 3D Weather Atmosphere`;
  }
  if (condition3dEl) {
    condition3dEl.textContent = wmo.label;
  }

  // Precipitation Bento
  const precipProbEl = document.getElementById('bento-precip-prob');
  const precipAmountEl = document.getElementById('bento-precip-amount');
  const prob = daily && daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0;
  const amount = daily && daily.precipitation_sum ? daily.precipitation_sum[0] : 0;

  if (precipProbEl) {
    precipProbEl.textContent = `${prob || 0}%`;
  }
  if (precipAmountEl) {
    precipAmountEl.textContent = `${amount || 0} mm in next 24h`;
  }

  // Adjust rain animation intensity based on probability
  const dropsGroup = document.getElementById('precip-drops-group');
  const ripplesGroup = document.getElementById('precip-ripples-group');
  if (dropsGroup) {
    if (prob === 0) {
      dropsGroup.style.opacity = '0.75';
      if (ripplesGroup) ripplesGroup.style.opacity = '0.65';
    } else if (prob < 30) {
      dropsGroup.style.opacity = '0.9';
      if (ripplesGroup) ripplesGroup.style.opacity = '0.85';
    } else {
      dropsGroup.style.opacity = '1';
      if (ripplesGroup) ripplesGroup.style.opacity = '1';
    }
  }

  // Air Quality Bento (Calibrated Working Meter)
  const aqiValEl = document.getElementById('bento-aqi-value');
  const aqiStatusEl = document.getElementById('bento-aqi-status');
  const aqiData = state.airQualityData;
  const needleGroup = document.getElementById('aqi-needle-group');
  const activeArc = document.getElementById('aqi-active-arc');
  const aqiNeedleTip = document.getElementById('aqi-needle-tip');
  const aqiCenterDot = document.getElementById('aqi-center-dot');
  const pm25El = document.getElementById('aqi-pm25');
  const pm10El = document.getElementById('aqi-pm10');
  const o3El = document.getElementById('aqi-o3');

  let usAqi = 42;
  if (aqiData && aqiData.current && aqiData.current.us_aqi !== null && aqiData.current.us_aqi !== undefined) {
    usAqi = Math.round(aqiData.current.us_aqi);
  }

  if (aqiValEl && aqiStatusEl) {
    aqiValEl.textContent = usAqi;
    const category = getAqiCategory(usAqi);
    aqiStatusEl.textContent = category.label;
    aqiStatusEl.className = `text-xs font-semibold px-2 py-0.5 rounded-full ${category.bgClass} ${category.textClass}`;

    // Dynamic AQI Gauge Needle Rotation (-90deg at 0 AQI to +90deg at 300 AQI, Pivot at 80, 78)
    const normalizedAqi = Math.min(300, Math.max(0, usAqi));
    const angle = -90 + (normalizedAqi / 300) * 180;
    if (needleGroup) {
      needleGroup.setAttribute('transform', `rotate(${angle.toFixed(1)} 80 78)`);
    }

    // Active illuminated arc fill (176 total arc length)
    if (activeArc) {
      const arcLength = 176;
      const offset = arcLength - (normalizedAqi / 300) * arcLength;
      activeArc.style.strokeDasharray = `${arcLength}`;
      activeArc.style.strokeDashoffset = `${offset.toFixed(1)}`;
    }

    // Dynamic Color Coding for Needle & Hub
    let colorHex = '#10b981'; // Green (Good)
    if (usAqi > 50 && usAqi <= 100) colorHex = '#eab308'; // Yellow (Moderate)
    else if (usAqi > 100 && usAqi <= 150) colorHex = '#f97316'; // Orange (Sensitive)
    else if (usAqi > 150 && usAqi <= 200) colorHex = '#ef4444'; // Red (Unhealthy)
    else if (usAqi > 200) colorHex = '#a855f7'; // Purple (Hazardous)

    if (aqiNeedleTip) aqiNeedleTip.setAttribute('fill', colorHex);
    if (aqiCenterDot) aqiCenterDot.setAttribute('fill', colorHex);

    // Populate Sub-pollutants (PM2.5, PM10, O3)
    if (aqiData && aqiData.current) {
      if (pm25El && aqiData.current.pm2_5 !== undefined) pm25El.textContent = `PM2.5: ${Math.round(aqiData.current.pm2_5)}µg`;
      if (pm10El && aqiData.current.pm10 !== undefined) pm10El.textContent = `PM10: ${Math.round(aqiData.current.pm10)}µg`;
      if (o3El && aqiData.current.ozone !== undefined) o3El.textContent = `O₃: ${Math.round(aqiData.current.ozone)}µg`;
    }
  }
}

/**
 * Render Hourly Forecast Carousel (Next 24 Hours)
 */
function renderHourlyForecast() {
  const weather = state.weatherData;
  if (!weather || !weather.hourly) return;

  const container = document.getElementById('hourly-forecast-track');
  if (!container) return;

  container.innerHTML = '';
  const hourly = weather.hourly;
  const times = hourly.time;

  // Find current hour index
  const nowUtc = new Date();
  let startIndex = 0;
  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);
    if (t >= nowUtc || i === 0) {
      startIndex = Math.max(0, i);
      break;
    }
  }

  // Show 24 hours
  const hoursToShow = 24;
  for (let i = startIndex; i < Math.min(times.length, startIndex + hoursToShow); i++) {
    const timeStr = times[i];
    const dateObj = new Date(timeStr);
    const isFirst = (i === startIndex);
    
    // Format hour
    let hourDisplay = isFirst ? 'Now' : dateObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    
    const temp = formatTemp(hourly.temperature_2m[i]);
    const code = hourly.weather_code[i];
    const isDay = hourly.is_day ? hourly.is_day[i] === 1 : true;
    const wmo = WMO_CODES[code] || { icon: 'sunny', nightIcon: 'clear_night', label: 'Clear' };
    const iconName = isDay ? wmo.icon : (wmo.nightIcon || wmo.icon);
    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;

    const item = document.createElement('div');
    item.className = isFirst
      ? 'flex flex-col items-center min-w-[85px] glass-panel-heavy rounded-xl py-4 px-3 border border-primary/40 shadow-lg shadow-primary/10 flex-shrink-0 cursor-default'
      : 'flex flex-col items-center min-w-[80px] glass-panel hover:bg-white/10 rounded-xl py-4 px-2 transition-all flex-shrink-0 cursor-default';

    item.innerHTML = `
      <span class="text-xs ${isFirst ? 'text-primary font-bold' : 'text-on-surface-variant'} mb-2">${hourDisplay}</span>
      <span class="material-symbols-outlined text-2xl ${isFirst ? 'text-primary' : 'text-primary-container'} mb-2">${iconName}</span>
      ${pop > 15 ? `<span class="text-[10px] text-cyan-400 font-medium mb-1">${pop}%</span>` : `<span class="text-[10px] text-transparent mb-1">-</span>`}
      <span class="font-semibold text-white text-sm">${temp}</span>
    `;

    container.appendChild(item);
  }
}

/**
 * Render 7-Day / 10-Day Forecast List with Dynamic Temperature Range Bars
 */
function renderDailyForecast() {
  const weather = state.weatherData;
  if (!weather || !weather.daily) return;

  const container = document.getElementById('daily-forecast-container');
  if (!container) return;

  container.innerHTML = '';
  const daily = weather.daily;
  const days = daily.time;

  // Calculate global min and max for range bars
  let globalMin = Math.min(...daily.temperature_2m_min);
  let globalMax = Math.max(...daily.temperature_2m_max);
  if (globalMax === globalMin) globalMax += 1;

  for (let i = 0; i < Math.min(days.length, 7); i++) {
    const dateObj = new Date(days[i] + 'T00:00:00');
    const dayLabel = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const code = daily.weather_code[i];
    const wmo = WMO_CODES[code] || { icon: 'sunny', label: 'Clear' };
    const pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;
    
    const minTemp = daily.temperature_2m_min[i];
    const maxTemp = daily.temperature_2m_max[i];

    // Bar percentage
    const leftPercent = Math.max(0, ((minTemp - globalMin) / (globalMax - globalMin)) * 100);
    const widthPercent = Math.max(15, ((maxTemp - minTemp) / (globalMax - globalMin)) * 100);

    const row = document.createElement('div');
    row.className = `flex items-center justify-between p-3.5 hover:bg-white/5 rounded-xl transition-colors ${i > 0 ? 'border-t border-white/5' : ''}`;

    row.innerHTML = `
      <div class="w-24 flex items-center gap-2">
        <span class="font-medium ${i === 0 ? 'text-white font-bold' : 'text-on-surface-variant'}">${dayLabel}</span>
      </div>
      <div class="flex items-center gap-2 w-28">
        <span class="material-symbols-outlined text-primary-container text-xl">${wmo.icon}</span>
        <span class="text-xs ${pop > 20 ? 'text-cyan-400 font-semibold' : 'text-on-surface-variant'}">${pop}%</span>
      </div>
      <div class="flex items-center gap-3 flex-1 max-w-[200px] justify-end">
        <span class="text-on-surface-variant text-sm font-mono w-8 text-right">${formatTemp(minTemp)}</span>
        <div class="w-24 h-2 rounded-full bg-surface-container-highest relative overflow-hidden">
          <div class="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-blue-400 via-amber-300 to-rose-400"
               style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
        </div>
        <span class="text-white font-semibold text-sm font-mono w-8 text-left">${formatTemp(maxTemp)}</span>
      </div>
    `;

    container.appendChild(row);
  }
}

/**
 * Render Extra Bento Analytics (UV Index, Wind Gusts, Pressure, Sunrise/Sunset)
 */
function renderExtraAnalytics() {
  const weather = state.weatherData;
  if (!weather || !weather.current || !weather.daily) return;

  const current = weather.current;
  const daily = weather.daily;

  // UV Index (Current or daily max)
  const uvEl = document.getElementById('bento-uv-value');
  const uvStatusEl = document.getElementById('bento-uv-status');
  if (uvEl && uvStatusEl && weather.hourly && weather.hourly.uv_index) {
    const currentHourIndex = new Date().getHours();
    const uvVal = Math.round(weather.hourly.uv_index[currentHourIndex] || 0);
    uvEl.textContent = uvVal;
    let uvLabel = 'Low';
    let uvColor = 'text-emerald-400';
    if (uvVal >= 3 && uvVal <= 5) { uvLabel = 'Moderate'; uvColor = 'text-yellow-400'; }
    else if (uvVal >= 6 && uvVal <= 7) { uvLabel = 'High'; uvColor = 'text-orange-400'; }
    else if (uvVal >= 8) { uvLabel = 'Very High'; uvColor = 'text-rose-400'; }
    uvStatusEl.textContent = uvLabel;
    uvStatusEl.className = `text-xs font-semibold ${uvColor}`;
  }

  // Pressure & Wind Gusts
  const pressureEl = document.getElementById('bento-pressure-value');
  if (pressureEl && current.surface_pressure) {
    pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;
  }

  // Sunrise & Sunset
  const sunriseEl = document.getElementById('bento-sunrise-value');
  const sunsetEl = document.getElementById('bento-sunset-value');
  if (sunriseEl && sunsetEl && daily.sunrise && daily.sunset) {
    const sunriseDate = new Date(daily.sunrise[0]);
    const sunsetDate = new Date(daily.sunset[0]);
    sunriseEl.textContent = sunriseDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    sunsetEl.textContent = sunsetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
}

/**
 * Universal Location Search Resolver (Handles PIN/ZIP codes, Cities, Counties, States, Districts)
 */
async function searchLocationsUniversal(query) {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const results = [];
  const seen = new Set();
  const isPostalOrStructured = /^\d{3,10}$/i.test(clean) || clean.includes(',') || /^[A-Z0-9]{2,4}\s?[A-Z0-9]{2,4}$/i.test(clean);

  // 1. Query Open-Meteo Geocoding API
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=8&language=en&format=json`;
    const res = await fetch(omUrl);
    const data = await res.json();
    if (data && data.results) {
      data.results.forEach(r => {
        const key = `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name: r.name,
            admin1: r.admin1 || '',
            country: r.country || '',
            countryCode: r.country_code || '',
            lat: r.latitude,
            lon: r.longitude,
            timezone: r.timezone || 'auto',
            type: 'City'
          });
        }
      });
    }
  } catch (e) {
    console.warn('Open-Meteo geocode error:', e);
  }

  // 2. Query Nominatim for PIN / ZIP codes, Counties, Districts
  if (isPostalOrStructured || results.length < 3) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean)}&format=json&addressdetails=1&limit=6`;
      const res = await fetch(nomUrl, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach(r => {
          const lat = parseFloat(r.lat);
          const lon = parseFloat(r.lon);
          const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
          if (!seen.has(key)) {
            seen.add(key);
            const addr = r.address || {};
            let placeName = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || r.name || clean;
            if (addr.postcode) {
              placeName = `${addr.postcode} • ${placeName}`;
            }
            const adminParts = [addr.county, addr.state_district, addr.state].filter(Boolean);
            const admin = adminParts.filter((v, i, a) => a.indexOf(v) === i).join(', ');
            const country = addr.country || '';
            const countryCode = (addr.country_code || '').toUpperCase();

            results.push({
              name: placeName,
              admin1: admin,
              country: country,
              countryCode: countryCode,
              lat: lat,
              lon: lon,
              timezone: 'auto',
              type: addr.postcode ? 'PIN/ZIP' : (addr.county ? 'County' : 'Location')
            });
          }
        });
      }
    } catch (e) {
      console.warn('Nominatim geocode error:', e);
    }
  }

  return results;
}

/**
 * Autocomplete Search Bar Implementation (Supports PIN, ZIP, City, County across Navbar, Maps & Radar)
 */
function initSearchAutocomplete(inputId, dropdownId, btnId = null) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const searchBtn = btnId ? document.getElementById(btnId) : null;
  if (!input || !dropdown) return;

  let debounceTimer = null;
  let activeIndex = -1;

  async function triggerSearch(autoSelectFirst = false) {
    const query = input.value.trim();
    if (query.length < 2) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.innerHTML = `
      <div class="p-3 text-xs text-on-surface-variant flex items-center gap-2">
        <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
        Searching PIN/ZIP, cities, counties...
      </div>
    `;
    dropdown.classList.remove('hidden');

    try {
      const results = await searchLocationsUniversal(query);
      if (!results || results.length === 0) {
        dropdown.innerHTML = `
          <div class="p-3 text-xs text-on-surface-variant text-center">
            No locations or PIN codes found for "${escapeHtml(query)}"
          </div>
        `;
        return;
      }

      if (autoSelectFirst && results.length > 0) {
        const topLoc = results[0];
        dropdown.classList.add('hidden');
        input.value = '';
        fetchCityWeather({
          name: topLoc.name,
          country: topLoc.country || '',
          countryCode: topLoc.countryCode || '',
          admin1: topLoc.admin1 || '',
          lat: topLoc.lat,
          lon: topLoc.lon,
          timezone: topLoc.timezone || 'auto'
        });
        return;
      }

      renderSearchResults(results, dropdown, input);
    } catch (err) {
      console.error('Search error:', err);
      dropdown.innerHTML = `
        <div class="p-3 text-xs text-rose-300 text-center">
          Failed to search location. Please try again.
        </div>
      `;
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => triggerSearch(false), 280);
  });

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerSearch(true);
    });
  }

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target) && (!searchBtn || !searchBtn.contains(e.target))) {
      dropdown.classList.add('hidden');
    }
  });

  // Focus open
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && dropdown.children.length > 0) {
      dropdown.classList.remove('hidden');
    }
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.search-item');
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length) {
        items[activeIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      } else {
        triggerSearch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveSearchItem(items, activeIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveSearchItem(items, activeIndex);
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
    }
  });
}

function updateActiveSearchItem(items, activeIdx) {
  items.forEach((item, idx) => {
    if (idx === activeIdx) {
      item.classList.add('bg-white/15', 'text-white');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('bg-white/15', 'text-white');
    }
  });
}

function renderSearchResults(results, dropdown, input) {
  dropdown.innerHTML = '';
  results.forEach(loc => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-item w-full text-left px-3.5 py-2.5 hover:bg-white/10 flex items-center justify-between gap-3 text-sm text-on-surface transition-colors border-b border-white/5 last:border-0';
    
    const countryFlag = loc.countryCode ? getFlagEmoji(loc.countryCode) : '📍';
    const adminText = loc.admin1 ? `${loc.admin1}, ` : '';
    const badgeType = loc.type === 'PIN/ZIP' ? '<span class="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono font-bold mr-1">PIN</span>' : (loc.type === 'County' ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono mr-1">County</span>' : '');

    btn.innerHTML = `
      <div class="flex items-center gap-2.5 overflow-hidden">
        <span class="text-base flex-shrink-0">${countryFlag}</span>
        <div class="truncate">
          <div class="flex items-center gap-1">
            ${badgeType}
            <span class="font-semibold text-white truncate">${escapeHtml(loc.name)}</span>
          </div>
          <span class="text-xs text-on-surface-variant block truncate">${escapeHtml(adminText)}${escapeHtml(loc.country || '')}</span>
        </div>
      </div>
      <span class="text-[11px] font-mono text-primary/70 flex-shrink-0">${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°</span>
    `;

    btn.addEventListener('click', () => {
      dropdown.classList.add('hidden');
      input.value = '';
      fetchCityWeather({
        name: loc.name,
        country: loc.country || '',
        countryCode: loc.countryCode || '',
        admin1: loc.admin1 || '',
        lat: loc.lat,
        lon: loc.lon,
        timezone: loc.timezone || 'auto'
      });
    });

    dropdown.appendChild(btn);
  });
}

/**
 * Handle Preset City Pills
 */
function handlePresetCityClick(cityKey) {
  const presets = {
    'toronto': { name: 'Toronto', country: 'Canada', countryCode: 'CA', admin1: 'Ontario', lat: 43.6532, lon: -79.3832 },
    'new york': { name: 'New York', country: 'United States', countryCode: 'US', admin1: 'New York', lat: 40.7128, lon: -74.0060 },
    'london': { name: 'London', country: 'United Kingdom', countryCode: 'GB', admin1: 'England', lat: 51.5074, lon: -0.1278 },
    'tokyo': { name: 'Tokyo', country: 'Japan', countryCode: 'JP', admin1: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    'paris': { name: 'Paris', country: 'France', countryCode: 'FR', admin1: 'Île-de-France', lat: 48.8566, lon: 2.3522 },
    'dubai': { name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', admin1: 'Dubai', lat: 25.2048, lon: 55.2708 },
    'sydney': { name: 'Sydney', country: 'Australia', countryCode: 'AU', admin1: 'New South Wales', lat: -33.8688, lon: 151.2093 },
    'mumbai': { name: 'Mumbai', country: 'India', countryCode: 'IN', admin1: 'Maharashtra', lat: 19.0760, lon: 72.8777 }
  };

  const city = presets[cityKey.toLowerCase()];
  if (city) {
    fetchCityWeather(city);
  }
}

/**
 * Locate User with HTML5 Geolocation
 */
function locateUser() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  showToast('Locating your position...', 'info');
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        // Reverse Geocoding with BigDataCloud / Open-Meteo
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const data = await res.json();
        
        const cityName = data.city || data.locality || data.principalSubdivision || 'Your Location';
        const countryName = data.countryName || '';
        const countryCode = data.countryCode || '';
        const admin = data.principalSubdivision || '';

        fetchCityWeather({
          name: cityName,
          country: countryName,
          countryCode: countryCode,
          admin1: admin,
          lat: lat,
          lon: lon,
          timezone: 'auto'
        });
        showToast(`Located in ${cityName}, ${countryName}`, 'success');
      } catch (err) {
        // Fallback with coordinates
        fetchCityWeather({
          name: 'My Location',
          country: '',
          countryCode: '',
          admin1: '',
          lat: lat,
          lon: lon,
          timezone: 'auto'
        });
      }
    },
    (error) => {
      console.warn('Geolocation error:', error);
      showToast('Could not access your location. Please check location permissions.', 'error');
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

/**
 * Temperature & Wind Unit Toggling
 */
function toggleTemperatureUnit() {
  state.unit = state.unit === 'C' ? 'F' : 'C';
  state.windUnit = state.unit === 'C' ? 'kmh' : 'mph';
  localStorage.setItem('aeroweather_unit', state.unit);
  localStorage.setItem('aeroweather_wind_unit', state.windUnit);

  // Update button display
  updateUnitButtons();

  // Re-render
  if (state.weatherData) {
    renderHeroCard();
    renderSidebarBento();
    renderHourlyForecast();
    renderDailyForecast();
    renderExtraAnalytics();
  }
}

function updateUnitButtons() {
  const buttons = document.querySelectorAll('.unit-toggle-label');
  buttons.forEach(btn => {
    btn.textContent = `°${state.unit}`;
  });
}

function formatTemp(celsius) {
  if (celsius === undefined || celsius === null) return '--';
  if (state.unit === 'F') {
    const fahr = Math.round((celsius * 9) / 5 + 32);
    return `${fahr}°`;
  }
  return `${Math.round(celsius)}°`;
}

function formatWind(kmh) {
  if (kmh === undefined || kmh === null) return '--';
  if (state.windUnit === 'mph') {
    const mph = Math.round(kmh * 0.621371);
    return `${mph} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

/**
 * Air Quality Helper (US EPA Scale)
 */
function getAqiCategory(aqi) {
  if (aqi <= 50) return { label: 'Good', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-300' };
  if (aqi <= 100) return { label: 'Moderate', bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-300' };
  if (aqi <= 150) return { label: 'Sensitive', bgClass: 'bg-orange-500/20', textClass: 'text-orange-300' };
  if (aqi <= 200) return { label: 'Unhealthy', bgClass: 'bg-rose-500/20', textClass: 'text-rose-300' };
  return { label: 'Hazardous', bgClass: 'bg-purple-500/20', textClass: 'text-purple-300' };
}

// Base Map Layer Configurations
const MAP_LAYERS = {
  satellite: {
    name: 'Satellite',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    options: { maxZoom: 19, maxNativeZoom: 19, crossOrigin: true, attribution: 'Tiles &copy; Esri World Imagery' }
  },
  dark: {
    name: 'Dark',
    base: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, maxNativeZoom: 18, subdomains: 'abcd', crossOrigin: true }
  },
  streets: {
    name: 'Streets',
    base: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: { maxZoom: 19, maxNativeZoom: 18, subdomains: 'abcd', crossOrigin: true }
  }
};

/**
 * Set and apply Map Style (Satellite, Dark, Streets)
 */
function setMapStyle(styleKey) {
  if (!MAP_LAYERS[styleKey]) styleKey = 'satellite';
  state.mapStyle = styleKey;
  localStorage.setItem('aeroweather_map_style', styleKey);

  updateMapStyleButtonsUI();

  if (state.weatherMap) {
    applyMapStyleToMap(state.weatherMap, 'weather', styleKey);
    state.weatherMap.invalidateSize();
  }
  if (state.radarMap) {
    applyMapStyleToMap(state.radarMap, 'radar', styleKey);
    state.radarMap.invalidateSize();
  }
}

/**
 * Reset 3D Earth Globe View to Space Altitude
 */
function reset3DEarthView() {
  if (state.globe3D && state.globe3D.initialized) {
    state.globe3D.targetZoomDistance = 3.2;
    rotate3DEarthToLatLon(state.currentCity.lat, state.currentCity.lon, true);
  }
}

/**
 * Zoom In / Out on 3D Earth Globe
 */
function zoom3DEarth(factor) {
  if (state.globe3D && state.globe3D.initialized) {
    state.globe3D.targetZoomDistance = Math.max(1.6, Math.min(5.5, state.globe3D.targetZoomDistance * factor));
  }
}

/**
 * Apply selected 2D map style to a map instance
 */
function applyMapStyleToMap(mapInstance, mapType, styleKey) {
  if (!mapInstance) return;
  const config = (MAP_LAYERS[styleKey] && MAP_LAYERS[styleKey].base) ? MAP_LAYERS[styleKey] : MAP_LAYERS.satellite;

  // Clear existing base layers
  const layerKey = mapType === 'weather' ? 'weatherBaseLayers' : 'radarBaseLayers';
  if (state[layerKey] && state[layerKey].length > 0) {
    state[layerKey].forEach(l => {
      if (mapInstance.hasLayer(l)) mapInstance.removeLayer(l);
    });
  }
  state[layerKey] = [];

  // Add base imagery/street tile
  const baseTile = L.tileLayer(config.base, config.options);
  baseTile.addTo(mapInstance);
  state[layerKey].push(baseTile);

  // If satellite, add boundary and place labels overlay
  if (config.labels) {
    const labelTile = L.tileLayer(config.labels, {
      maxZoom: 19,
      maxNativeZoom: 19,
      opacity: 0.9,
      crossOrigin: true
    });
    labelTile.addTo(mapInstance);
    state[layerKey].push(labelTile);
  }

  // Ensure marker stays on top
  const marker = mapType === 'weather' ? state.weatherMarker : state.radarMarker;
  if (marker && mapInstance.hasLayer(marker)) {
    marker.setZIndexOffset(1000);
  }
}

/**
 * Update visual active state on map style switcher buttons
 */
function updateMapStyleButtonsUI() {
  const current = state.mapStyle || 'globe3d';
  document.querySelectorAll('.map-style-btn, .radar-style-btn').forEach(btn => {
    const s = btn.getAttribute('data-style');
    if (s === current) {
      btn.className = btn.className.replace(/text-on-surface-variant|bg-transparent|hover:bg-white\/10/g, '').trim();
      btn.classList.add('bg-primary', 'text-background', 'font-bold', 'shadow-sm');
    } else {
      btn.classList.remove('bg-primary', 'text-background', 'font-bold', 'shadow-sm');
      btn.classList.add('text-on-surface-variant', 'bg-transparent', 'hover:bg-white/10');
    }
  });
}

/**
 * Convert Latitude & Longitude to 3D Cartesian coordinates on sphere
 */
function latLonToVector3(lat, lon, radius = 1.015) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return new THREE.Vector3(x, y, z);
}

/**
 * Update 3D beacon marker position on globe
 */
function update3DMarkerPosition(lat, lon) {
  if (!state.globe3D || !state.globe3D.markerGroup) return;
  const pos = latLonToVector3(lat, lon, 1.015);
  state.globe3D.markerGroup.position.copy(pos);
  state.globe3D.markerGroup.lookAt(pos.clone().multiplyScalar(2));
}

/**
 * Rotate 3D Earth Globe so that [lat, lon] faces the camera directly
 */
function rotate3DEarthToLatLon(lat, lon, animate = true) {
  if (!state.globe3D || !state.globe3D.earthMesh) return;

  const targetRotationY = -((lon + 90) * (Math.PI / 180));
  const targetRotationX = (lat * (Math.PI / 180));

  if (!animate) {
    state.globe3D.earthMesh.rotation.y = targetRotationY;
    state.globe3D.earthMesh.rotation.x = targetRotationX;
    if (state.globe3D.cloudsMesh) {
      state.globe3D.cloudsMesh.rotation.y = targetRotationY;
      state.globe3D.cloudsMesh.rotation.x = targetRotationX;
    }
    return;
  }

  state.globe3D.animatingFlight = true;
  const startY = state.globe3D.earthMesh.rotation.y;
  const startX = state.globe3D.earthMesh.rotation.x;
  const startTime = performance.now();
  const duration = 1800;

  // Shortest angle difference
  let diffY = (targetRotationY - startY) % (Math.PI * 2);
  if (diffY > Math.PI) diffY -= Math.PI * 2;
  if (diffY < -Math.PI) diffY += Math.PI * 2;

  // Pull back to space altitude
  state.globe3D.targetZoomDistance = 4.2;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

    state.globe3D.earthMesh.rotation.y = startY + diffY * ease;
    state.globe3D.earthMesh.rotation.x = startX + (targetRotationX - startX) * ease;
    if (state.globe3D.cloudsMesh) {
      state.globe3D.cloudsMesh.rotation.y = state.globe3D.earthMesh.rotation.y;
      state.globe3D.cloudsMesh.rotation.x = state.globe3D.earthMesh.rotation.x;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      state.globe3D.animatingFlight = false;
      state.globe3D.targetZoomDistance = 2.1;
    }
  }

  requestAnimationFrame(step);
}

/**
 * Generate Procedural Earth Canvas Texture (Ultra-Reliable Instant 3D Fallback & Base)
 */
function createProceduralEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Deep Blue Ocean Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  oceanGrad.addColorStop(0, '#0c274c');
  oceanGrad.addColorStop(0.2, '#0a2342');
  oceanGrad.addColorStop(0.5, '#07182e');
  oceanGrad.addColorStop(0.8, '#0a2342');
  oceanGrad.addColorStop(1, '#0c274c');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Polar Ice Caps
  ctx.fillStyle = '#eaf4ff';
  ctx.beginPath();
  ctx.ellipse(1024, 30, 1024, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1024, 990, 1024, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  // Continental Landmasses
  ctx.fillStyle = '#2d5a27'; // Forest green
  
  // North America
  ctx.beginPath();
  ctx.ellipse(460, 310, 210, 140, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8b6f47'; // Rocky mountains / Great plains
  ctx.beginPath();
  ctx.ellipse(390, 300, 60, 120, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // South America
  ctx.fillStyle = '#1e4d1e'; // Amazon green
  ctx.beginPath();
  ctx.ellipse(630, 680, 130, 210, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8b6f47'; // Andes
  ctx.beginPath();
  ctx.ellipse(540, 670, 30, 190, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Eurasia (Europe + Asia)
  ctx.fillStyle = '#2c5926';
  ctx.beginPath();
  ctx.ellipse(1380, 310, 390, 160, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9c8159'; // Himalayas & Tibet Plateau
  ctx.beginPath();
  ctx.ellipse(1460, 370, 170, 50, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Africa
  ctx.fillStyle = '#a68a4c'; // Sahara Desert
  ctx.beginPath();
  ctx.ellipse(1120, 510, 160, 170, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a431c'; // Central Africa jungle
  ctx.beginPath();
  ctx.ellipse(1130, 580, 110, 110, 0, 0, Math.PI * 2);
  ctx.fill();

  // Australia
  ctx.fillStyle = '#9b5d2b'; // Outback
  ctx.beginPath();
  ctx.ellipse(1690, 720, 130, 95, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // Subtle Atmospheric Coordinate Grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1.5;
  for (let y = 120; y < 1000; y += 150) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }
  for (let x = 0; x < 2048; x += 256) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Initialize 3D Earth WebGL Globe using Three.js
 */
function init3DEarthGlobe() {
  if (typeof THREE === 'undefined') return;
  const container = document.getElementById('globe-3d-viewport');
  if (!container || state.globe3D.initialized) return;

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 580;

  // Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.z = 3.2;

  // WebGL Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);

  // High-Res Earth Sphere with instant canvas texture + async asset enhancement
  const earthGeometry = new THREE.SphereGeometry(1.0, 64, 64);
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: createProceduralEarthTexture(),
    shininess: 20,
    specular: new THREE.Color(0x223344)
  });
  const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earthMesh);

  // Asynchronously load ultra high-res realistic photo texture
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('assets/earth_atmos_2048.jpg', (tex) => {
    earthMaterial.map = tex;
    earthMaterial.needsUpdate = true;
  });

  // Dynamic Drifting Cloud Layer
  const cloudsGeometry = new THREE.SphereGeometry(1.015, 48, 48);
  const cloudsMaterial = new THREE.MeshLambertMaterial({
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });
  const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
  scene.add(cloudsMesh);

  textureLoader.load('assets/earth_clouds_1024.png', (tex) => {
    cloudsMaterial.map = tex;
    cloudsMaterial.needsUpdate = true;
  });

  // Glowing Atmosphere Halo
  const atmosGeometry = new THREE.SphereGeometry(1.12, 48, 48);
  const atmosMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
        gl_FragColor = vec4(0.35, 0.7, 1.0, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  const atmosphereMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
  scene.add(atmosphereMesh);

  // Starfield particle background
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 1200;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 80;
    starPositions[i + 1] = (Math.random() - 0.5) * 80;
    starPositions[i + 2] = -15 - Math.random() * 40;
  }
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.8 });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // 3D Location Marker Beacon Group
  const markerGroup = new THREE.Group();
  
  const markerCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.024, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  markerGroup.add(markerCore);

  const markerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.045, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  markerGroup.add(markerRing);

  const markerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.25, 8),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9 })
  );
  markerBeam.position.y = 0.125;
  markerGroup.add(markerBeam);

  scene.add(markerGroup);

  state.globe3D = {
    initialized: true,
    scene,
    camera,
    renderer,
    earthMesh,
    cloudsMesh,
    atmosphereMesh,
    markerGroup,
    markerRing,
    stars,
    currentLat: state.currentCity.lat,
    currentLon: state.currentCity.lon,
    targetLat: state.currentCity.lat,
    targetLon: state.currentCity.lon,
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    rotationVelocity: { x: 0.001, y: 0 },
    zoomDistance: 3.2,
    targetZoomDistance: 3.2,
    animatingFlight: false
  };

  // Position initial marker
  update3DMarkerPosition(state.currentCity.lat, state.currentCity.lon);
  rotate3DEarthToLatLon(state.currentCity.lat, state.currentCity.lon, false);

  // Mouse & Touch Interactivity
  container.addEventListener('pointerdown', (e) => {
    state.globe3D.isDragging = true;
    state.globe3D.previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointermove', (e) => {
    if (!state.globe3D.isDragging || !state.globe3D.earthMesh) return;
    const deltaX = e.clientX - state.globe3D.previousMousePosition.x;
    const deltaY = e.clientY - state.globe3D.previousMousePosition.y;

    state.globe3D.earthMesh.rotation.y += deltaX * 0.005;
    state.globe3D.earthMesh.rotation.x = Math.max(-1.4, Math.min(1.4, state.globe3D.earthMesh.rotation.x + deltaY * 0.005));
    if (state.globe3D.cloudsMesh) {
      state.globe3D.cloudsMesh.rotation.y = state.globe3D.earthMesh.rotation.y;
      state.globe3D.cloudsMesh.rotation.x = state.globe3D.earthMesh.rotation.x;
    }
    state.globe3D.previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', () => {
    state.globe3D.isDragging = false;
  });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.25 : -0.25;
    state.globe3D.targetZoomDistance = Math.max(1.6, Math.min(5.5, state.globe3D.targetZoomDistance + delta));
  }, { passive: false });

  window.addEventListener('resize', () => {
    if (!state.globe3D.initialized || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w && h && renderer && camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  });

  // Render Loop
  let ringScale = 1.0;
  function animateGlobe() {
    requestAnimationFrame(animateGlobe);

    if (state.mapStyle === 'globe3d') {
      if (cloudsMesh) cloudsMesh.rotation.y += 0.0006;

      if (!state.globe3D.isDragging && !state.globe3D.animatingFlight) {
        earthMesh.rotation.y += 0.001;
        if (cloudsMesh) cloudsMesh.rotation.y += 0.001;
      }

      camera.position.z += (state.globe3D.targetZoomDistance - camera.position.z) * 0.08;

      if (markerRing) {
        ringScale += 0.025;
        if (ringScale > 2.6) ringScale = 0.8;
        markerRing.scale.set(ringScale, ringScale, ringScale);
        markerRing.material.opacity = Math.max(0, 1.0 - (ringScale - 0.8) / 1.8);
      }

      const altVal = Math.round(camera.position.z * 4000);
      const hudAlt = document.getElementById('globe-hud-alt');
      if (hudAlt) hudAlt.textContent = `ALT: ${altVal.toLocaleString()} KM`;

      renderer.render(scene, camera);
    }
  }

  animateGlobe();
}

/**
 * Cinematic 3D Earth Multi-Stage Orbital Zoom In / Zoom Out Flight
 */
function performCinematic3DEarthFlight(lat, lon, cityName, tempStr = '', regionStr = '') {
  // Update HUD Flight Banner
  const banner = document.getElementById('cinematic-flight-banner');
  const bannerTarget = document.getElementById('cinematic-flight-target');
  if (banner && bannerTarget) {
    bannerTarget.textContent = `Navigating 3D Flight to ${cityName}...`;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 3500);
  }

  // Cinematic Multi-Stage Space-to-Ground Dive on Satellite / Active Map
  if (state.weatherMap) {
    const currentZoom = state.weatherMap.getZoom();

    // Stage 1: Space Orbit pull-back (zoom-out) if currently zoomed in
    if (currentZoom > 6) {
      state.weatherMap.flyTo(state.weatherMap.getCenter(), 4, {
        duration: 0.9,
        easeLinearity: 0.25
      });
    }

    // Stage 2: Parabolic trajectory pan + Hypersonic ground dive (zoom-in)
    setTimeout(() => {
      if (!state.weatherMap) return;
      state.weatherMap.flyTo([lat, lon], 12, {
        duration: 2.2,
        easeLinearity: 0.15
      });

      if (state.weatherMarker) {
        state.weatherMarker.setLatLng([lat, lon]);
        
        // Custom 3D Beacon HTML Icon with pulsing sonic ripples
        const beaconIcon = L.divIcon({
          className: 'custom-3d-beacon-pin',
          html: `
            <div class="beacon-wave-1"></div>
            <div class="beacon-wave-2"></div>
            <div class="beacon-core-dot"></div>
          `,
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
        state.weatherMarker.setIcon(beaconIcon);

        setTimeout(() => {
          state.weatherMarker.bindPopup(`
            <div style="font-family: inherit; padding: 4px; min-width: 170px;">
              <div style="font-size: 10px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">🌍 3D TARGET REACHED</div>
              <div style="font-size: 15px; font-weight: bold; color: #ffffff;">${escapeHtml(cityName)}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">${escapeHtml(regionStr)}</div>
              <div style="font-size: 24px; font-weight: 900; color: #a4c9ff; line-height: 1;">${tempStr}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 5px;">Latitude: ${lat.toFixed(4)}° | Longitude: ${lon.toFixed(4)}°</div>
            </div>
          `).openPopup();
        }, 2200);
      }
    }, currentZoom > 6 ? 950 : 50);
  }
}

/**
 * Interactive Leaflet Weather Map Integration (2D Ground View)
 */
function initOrUpdateWeatherMap() {
  const container = document.getElementById('maps-container');
  if (!container) return;

  const lat = state.currentCity.lat;
  const lon = state.currentCity.lon;

  if (!state.weatherMap) {
    state.weatherMap = L.map('maps-container', {
      center: [lat, lon],
      zoom: 10,
      minZoom: 3,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      zoomControl: true,
      attributionControl: false
    });

    // Apply active map style (Satellite by default)
    applyMapStyleToMap(state.weatherMap, 'weather', state.mapStyle || 'satellite');

    // Weather City Marker
    state.weatherMarker = L.marker([lat, lon]).addTo(state.weatherMap);

    // Map Click Interaction: Click anywhere in the world to get weather!
    state.weatherMap.on('click', async (e) => {
      const clickLat = Number(e.latlng.lat.toFixed(4));
      const clickLon = Number(e.latlng.lng.toFixed(4));

      showToast(`Fetching weather for [${clickLat}, ${clickLon}]...`, 'info');
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${clickLat}&longitude=${clickLon}&localityLanguage=en`);
        const data = await res.json();
        const cityName = data.city || data.locality || data.principalSubdivision || `${clickLat}, ${clickLon}`;
        
        fetchCityWeather({
          name: cityName,
          country: data.countryName || '',
          countryCode: data.countryCode || '',
          admin1: data.principalSubdivision || '',
          lat: clickLat,
          lon: clickLon,
          timezone: 'auto'
        });
      } catch (err) {
        fetchCityWeather({
          name: `${clickLat}, ${clickLon}`,
          country: '',
          countryCode: '',
          admin1: '',
          lat: clickLat,
          lon: clickLon,
          timezone: 'auto'
        });
      }
    });

  } else {
    state.weatherMap.setView([lat, lon], 10);
    if (state.weatherMarker) {
      state.weatherMarker.setLatLng([lat, lon]);
    }
  }

  // Update popup content
  if (state.weatherMarker) {
    const tempStr = state.weatherData && state.weatherData.current ? formatTemp(state.weatherData.current.temperature_2m) : '';
    state.weatherMarker.bindPopup(`
      <div style="font-family: inherit; padding: 2px;">
        <div style="font-size: 14px; font-weight: bold; color: #a4c9ff; margin-bottom: 2px;">${escapeHtml(state.currentCity.name)}</div>
        <div style="font-size: 20px; font-weight: 800; color: #ffffff;">${tempStr}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Click anywhere on the map to inspect weather</div>
      </div>
    `).openPopup();
  }

  // Multiple size invalidations to ensure full-bleed map rendering
  [50, 150, 300, 600].forEach(delay => {
    setTimeout(() => {
      if (state.weatherMap) state.weatherMap.invalidateSize();
    }, delay);
  });
}

/**
 * Live RainViewer Radar Map Integration
 */
async function initOrUpdateRadarMap() {
  const container = document.getElementById('radar-container');
  if (!container) return;

  const lat = state.currentCity.lat;
  const lon = state.currentCity.lon;

  if (!state.radarMap) {
    state.radarMap = L.map('radar-container', {
      center: [lat, lon],
      zoom: 9,
      zoomControl: true,
      attributionControl: false
    });

    // Apply active map style (Satellite by default)
    applyMapStyleToMap(state.radarMap, 'radar', state.mapStyle || 'satellite');

    state.radarMarker = L.marker([lat, lon]).addTo(state.radarMap);
  } else {
    state.radarMap.setView([lat, lon], 9);
    if (state.radarMarker) {
      state.radarMarker.setLatLng([lat, lon]);
    }
  }

  // Update popup content
  if (state.radarMarker) {
    const tempStr = state.weatherData && state.weatherData.current ? formatTemp(state.weatherData.current.temperature_2m) : '';
    state.radarMarker.bindPopup(`
      <div style="font-family: inherit; padding: 2px;">
        <div style="font-size: 14px; font-weight: bold; color: #a4c9ff; margin-bottom: 2px;">${escapeHtml(state.currentCity.name)}</div>
        <div style="font-size: 18px; font-weight: 800; color: #ffffff;">${tempStr}</div>
      </div>
    `);
  }

  [50, 150, 300, 600].forEach(delay => {
    setTimeout(() => {
      if (state.radarMap) state.radarMap.invalidateSize();
    }, delay);
  });

  loadRainViewerRadar();
}

/**
 * Load RainViewer Real-Time Precipitation Radar
 */
async function loadRainViewerRadar() {
  try {
    const timeDisplay = document.getElementById('radar-frame-time');
    if (timeDisplay) timeDisplay.textContent = 'Loading live radar frames...';

    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const data = await res.json();
    if (!data || !data.radar || !data.radar.past) return;

    // Clear existing radar layers
    if (state.radarLayers && state.radarLayers.length > 0) {
      state.radarLayers.forEach(l => {
        if (state.radarMap && state.radarMap.hasLayer(l)) {
          state.radarMap.removeLayer(l);
        }
      });
    }
    state.radarLayers = [];
    state.radarTimestamps = [];

    const host = data.host || 'https://tilecache.rainviewer.com';
    const pastFrames = data.radar.past || [];
    const nowcastFrames = data.radar.nowcast || [];
    state.radarPastCount = pastFrames.length;

    const frames = [...pastFrames, ...nowcastFrames];
    state.radarTimestamps = frames.map(f => f.time);

    // Preload radar tile layers (with maxNativeZoom: 7 to eliminate "Zoom Level Not Supported" errors)
    frames.forEach((frame, idx) => {
      const tileUrl = `${host}${frame.path}/512/{z}/{x}/{y}/2/1_1.png`;
      const isLatestPast = idx === pastFrames.length - 1;

      const layer = L.tileLayer(tileUrl, {
        tileSize: 512,
        opacity: isLatestPast ? 0.78 : 0,
        zIndex: 10 + idx,
        minZoom: 0,
        maxNativeZoom: 7,
        maxZoom: 19,
        crossOrigin: true
      });
      layer.addTo(state.radarMap);
      state.radarLayers.push(layer);
    });

    state.radarCurrentIndex = Math.max(0, pastFrames.length - 1);
    updateRadarTimelineUI();
    setupRadarControls();

    // Start auto-play if not already playing
    if (!state.isRadarPlaying) {
      startRadarPlayback();
    }
  } catch (e) {
    console.warn('RainViewer Radar load failed:', e);
    const timeDisplay = document.getElementById('radar-frame-time');
    if (timeDisplay) timeDisplay.textContent = 'Radar data unavailable';
  }
}

function updateRadarTimelineUI() {
  const timeDisplay = document.getElementById('radar-frame-time');
  const scrubberTrack = document.getElementById('radar-scrubber-track');

  if (timeDisplay && state.radarTimestamps[state.radarCurrentIndex]) {
    const time = new Date(state.radarTimestamps[state.radarCurrentIndex] * 1000);
    const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const isNowcast = state.radarCurrentIndex >= (state.radarPastCount || state.radarTimestamps.length);
    timeDisplay.innerHTML = `${timeStr} <span class="text-[10px] ${isNowcast ? 'text-amber-400' : 'text-cyan-400'} font-sans font-semibold uppercase">(${isNowcast ? 'Forecast' : 'Past'} ${state.radarCurrentIndex + 1}/${state.radarTimestamps.length})</span>`;
  }

  // Update visual scrubber segments
  if (scrubberTrack && state.radarTimestamps.length > 0) {
    if (scrubberTrack.children.length !== state.radarTimestamps.length) {
      scrubberTrack.innerHTML = '';
      state.radarTimestamps.forEach((ts, idx) => {
        const seg = document.createElement('button');
        seg.className = 'flex-1 h-1.5 rounded-full transition-all cursor-pointer hover:h-2.5';
        seg.title = new Date(ts * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        seg.onclick = () => {
          pauseRadarPlayback();
          showRadarFrame(idx);
        };
        scrubberTrack.appendChild(seg);
      });
    }

    Array.from(scrubberTrack.children).forEach((seg, idx) => {
      const isCurrent = idx === state.radarCurrentIndex;
      const isNowcast = idx >= (state.radarPastCount || state.radarTimestamps.length);
      if (isCurrent) {
        seg.className = `flex-1 h-2.5 rounded-full transition-all cursor-pointer shadow-md ${isNowcast ? 'bg-amber-400 shadow-amber-400/50' : 'bg-cyan-400 shadow-cyan-400/50'}`;
      } else {
        seg.className = `flex-1 h-1.5 rounded-full transition-all cursor-pointer ${isNowcast ? 'bg-amber-500/25 hover:bg-amber-500/50' : 'bg-white/20 hover:bg-white/40'}`;
      }
    });
  }
}

function showRadarFrame(index) {
  if (!state.radarLayers || state.radarLayers.length === 0) return;
  const safeIndex = (index + state.radarLayers.length) % state.radarLayers.length;
  
  state.radarLayers.forEach((layer, idx) => {
    layer.setOpacity(idx === safeIndex ? 0.78 : 0);
  });

  state.radarCurrentIndex = safeIndex;
  updateRadarTimelineUI();
}

function startRadarPlayback() {
  if (state.radarInterval) clearInterval(state.radarInterval);
  state.isRadarPlaying = true;

  const playIcon = document.getElementById('radar-play-icon');
  if (playIcon) playIcon.textContent = 'pause';

  state.radarInterval = setInterval(() => {
    if (!state.radarLayers || state.radarLayers.length === 0) return;
    const nextIndex = (state.radarCurrentIndex + 1) % state.radarLayers.length;
    showRadarFrame(nextIndex);
  }, 800);
}

function pauseRadarPlayback() {
  if (state.radarInterval) clearInterval(state.radarInterval);
  state.isRadarPlaying = false;

  const playIcon = document.getElementById('radar-play-icon');
  if (playIcon) playIcon.textContent = 'play_arrow';
}

function setupRadarControls() {
  const playBtn = document.getElementById('radar-play-btn');
  const prevBtn = document.getElementById('radar-prev-btn');
  const nextBtn = document.getElementById('radar-next-btn');

  if (playBtn) {
    playBtn.onclick = () => {
      if (state.isRadarPlaying) {
        pauseRadarPlayback();
      } else {
        startRadarPlayback();
      }
    };
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      pauseRadarPlayback();
      showRadarFrame(state.radarCurrentIndex - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      pauseRadarPlayback();
      showRadarFrame(state.radarCurrentIndex + 1);
    };
  }
}

/**
 * Favorite Cities Management
 */
function toggleFavoriteCity() {
  const city = state.currentCity;
  const existsIdx = state.favorites.findIndex(f => f.lat === city.lat && f.lon === city.lon);

  if (existsIdx >= 0) {
    state.favorites.splice(existsIdx, 1);
    showToast(`Removed ${city.name} from favorites`, 'info');
  } else {
    state.favorites.push({
      name: city.name,
      country: city.country,
      countryCode: city.countryCode,
      lat: city.lat,
      lon: city.lon
    });
    showToast(`Saved ${city.name} to favorites!`, 'success');
  }

  localStorage.setItem('aeroweather_favorites', JSON.stringify(state.favorites));
  updateFavoriteIcon();
}

function updateFavoriteIcon() {
  const favIcon = document.getElementById('fav-icon-symbol');
  if (!favIcon) return;
  const isFav = state.favorites.some(f => f.lat === state.currentCity.lat && f.lon === state.currentCity.lon);
  favIcon.style.fontVariationSettings = isFav ? "'FILL' 1" : "'FILL' 0";
  favIcon.className = isFav ? 'material-symbols-outlined text-rose-400' : 'material-symbols-outlined text-on-surface-variant';
}

function showLoadingState(isLoading) {
  const refreshBtn = document.getElementById('refresh-weather-btn');
  if (refreshBtn) {
    const icon = refreshBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      if (isLoading) {
        icon.classList.add('animate-spin');
      } else {
        icon.classList.remove('animate-spin');
      }
    }
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('global-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl glass-panel-heavy text-sm font-medium border shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 ${
    type === 'error' ? 'border-rose-500/50 text-rose-200' : type === 'success' ? 'border-emerald-500/50 text-emerald-200' : 'border-primary/50 text-white'
  }`;
  
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.className = 'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl glass-panel-heavy text-sm font-medium border shadow-2xl transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none';
  }, 3500);
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '📍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}
