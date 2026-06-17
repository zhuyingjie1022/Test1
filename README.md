# SFO Highest Temperature Finder

A polished static website that finds the highest forecast temperature at San Francisco International Airport (SFO), then shows the peak day, peak hour, current conditions, daily highs/lows, and a peak-day hourly temperature trace.

The app uses the Open-Meteo Forecast API with SFO airport coordinates:

- Latitude: `37.6213`
- Longitude: `-122.379`
- Timezone: `America/Los_Angeles`

## Files

- `index.html` - page structure
- `styles.css` - responsive dashboard layout and visual design
- `app.js` - weather fetch, peak temperature calculation, trend summaries, and rendering
- `assets/sfo-weather.svg` - local weather illustration

## Run

Open `index.html` in a browser. No build step or API key is required.
