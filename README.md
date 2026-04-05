# Padel Portugal - Tournament Calendar, Rankings, and Points Tools

Live website: https://ricardowth.github.io/portugal_padel_tournaments/

This project is a static website that centralizes Portugal Padel Competition information in one place.
It includes:
- 2026 tournament calendar with filters and interactive map
- Points calculator by tournament level and phase
- Absolute rankings browser (male and female) with search, filters, and pagination

## Main Functionalities

### 1) Tournament Calendar (Home)
Path: `index.html`

Features:
- Search tournaments by name (with debounce for smoother filtering)
- Filter by month range (from month -> to month)
- Multi-select category filters:
  - Absolutos
  - Veteranos
  - Jovens
  - Apenas FIP
- Combined filtering logic (month + categories + search at the same time)
- Dynamic counters:
  - Total tournaments
  - FIP events
  - Currently visible tournaments
- Tournament cards with:
  - Date range
  - Location
  - Organization
  - Level badge (FIP/FPP/derived labels)
  - Points/prize metadata when available
  - Source links (FIP/FPP registrations/results)
  - Status badge for live/finished tournaments based on current date
- Empty-state handling when no tournament matches filters

### 2) Interactive Map (Calendar Page)

Features:
- Leaflet + OpenStreetMap map integration
- Colored custom SVG markers by tournament tier
- Grouping tournaments by location into a single marker popup
- Popup cards with tournament details for that location
- Map marker visibility synced with active UI filters and search
- Collapsible map section with toggle button

### 3) Points Calculator
Path: `content/points-calculator.html`

Features:
- Select tournament level (2000, 5000, 10000, 25000, 50000)
- Dynamic recalculation of points table values by phase:
  - Vencedor
  - Finalista
  - Meias
  - Quartos
  - Oitavos
  - 16Avos / 3o Lugar Grupo
  - 4o Lugar Grupo
- Uses a 10,000-point base matrix and level factor scaling
- Values are normalized/formatted for clean display

### 4) Rankings Browser
Path: `content/rankings.html`

Features:
- Switch between:
  - Absolutos Masculino
  - Absolutos Feminino
- Search by name, club, or license number
- Filter by:
  - Level
  - Age group (escalao)
  - Club
- Sort by ranking position
- Pagination (100 rows per page)
- Ranking variation display (positive values normalized with +)
- TiePadel integrations:
  - License number links to TiePadel dashboard
  - "Ver" links to advanced TiePadel stats
- Meta footer showing data source date and filtered/total athlete count
- Graceful error and empty-data states

### 5) Shared Site Features

- Reusable shared header with active page highlighting
- Navigation across Calendar, Points Calculator, and Rankings
- Theme toggle (light/dark) with localStorage persistence
- Dynamic social metadata per page:
  - Title
  - Description
  - Open Graph tags
  - Twitter tags
- Favicon + robots setup

## Data Sources and Structure

### Tournament dataset
- File: `data/tournaments.js`
- Exposes: `window.tournamentsData`
- Includes fields like:
  - name, start_date, end_date
  - location, organization
  - age_group
  - fip_data (level, categories, link)
  - fpp_data (points, categories, link, level)

### Rankings datasets
- CDN source (male): `https://cdn.jsdelivr.net/gh/ricardowth/portugal_padel_cdn@main/rankings/male/latest.json`
- CDN source (female): `https://cdn.jsdelivr.net/gh/ricardowth/portugal_padel_cdn@main/rankings/female/latest.json`
- Fetched at runtime and cached in localStorage (1-hour TTL).
- Include source date metadata and rankings arrays.

## Tech Stack

- Plain HTML, CSS, JavaScript (no framework)
- Leaflet for maps
- OpenStreetMap tiles
- Browser localStorage for:
  - Theme preference
  - Rankings cache (TTL-based)

## Project Structure

- `index.html` - Tournament calendar page
- `content/points-calculator.html` - Points calculator page
- `content/rankings.html` - Rankings page
- `scripts/main.js` - Calendar + map + filtering logic
- `scripts/points-calculator.js` - Calculator logic
- `scripts/rankings-combined.js` - Rankings loading/filtering/pagination
- `scripts/shared-header.js` - Shared top navigation/header
- `scripts/shared-theme.js` - Light/dark theme logic
- `scripts/shared-social-meta.js` - Dynamic social metadata
- `styles/main.css` - Global styles
- `data/tournaments.js` - Tournament data
- `data/levels.js` - Level position cutoff definitions

## Running Locally

Because this is a static site, you can run it with any simple local web server.

Example options:
- VS Code Live Server extension
- Python: `python -m http.server 8000`

Then open:
- `http://localhost:8000/` for the calendar
- `http://localhost:8000/content/points-calculator.html`
- `http://localhost:8000/content/rankings.html`

## Notes

- The published site is hosted via GitHub Pages at:
  https://ricardowth.github.io/portugal_padel_tournaments/
- Rankings logic fetches data from the jsDelivr CDN and caches it in localStorage with a 1-hour TTL.
