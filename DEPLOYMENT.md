# FloodLens AI — Feature Deployment Notes

This branch adds interactive detail modals, the Flood Response Tools section, and a floating safety assistant.

## Frontend (Vercel)

- Repository: `tarunkkumarsahu/FloodLens-AI`
- Production branch: `main`
- Preview branch: `feat/modals-chatbot`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root

Vercel should create a Preview Deployment for commits pushed to `feat/modals-chatbot`. The existing production deployment remains on `main`.

## Flask backend (Render or another persistent Python host)

Deploy the `SOLVIX_Flood_Prediction` directory as a separate web service.

- Root directory: `SOLVIX_Flood_Prediction`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`

Configure these environment variables on the backend host:

- `GEMINI_API_KEY`: your server-side Gemini API key (required for model-powered chatbot replies).
- `GEMINI_MODEL`: optional; defaults to `gemini-3.8-flash`.
- `FRONTEND_ORIGINS`: comma-separated exact origins allowed to call the API, for example the Vercel production URL and the feature preview URL.
- `FLOODLENS_DB_PATH`: path on a persistent disk for the SQLite report database, for example `/var/data/floodlens_reports.sqlite3`.

Do not commit real API keys or private credentials.

After the backend is deployed, edit `backend-config.js` and set:

```js
window.FLOODLENS_API_BASE = 'https://YOUR-BACKEND-HOST';
```

Commit that change to this feature branch. The chatbot will then use `POST /api/chat` through the Gemini API, and citizen reports will use `POST /api/reports`.

## Current feature behavior and limitations

- Weather Forecast uses Open-Meteo's public geocoding and forecast endpoints.
- Route estimates use OSRM and mapped shelter lookups use OpenStreetMap/Overpass. Routes are not flood-aware; confirm conditions and shelter availability with local authorities.
- Citizen reports are stored in the browser when no backend URL is configured. With a backend URL, the Flask API stores observations in SQLite. Reports are not automatically sent to emergency services or treated as verified.
- The Notification Centre shows the site's existing sample alerts, which are simulated.
- Historical Flood Analysis compares sample location records; it is not a verified historical time series.
- The assistant offers local safety guidance when no backend is configured. Model-powered responses require `GEMINI_API_KEY` on the Flask host.

## Validation

GitHub Actions runs:
- `node --check features.js`
- `npm run build`
- `python -m py_compile SOLVIX_Flood_Prediction/app.py`

These checks verify syntax/build integrity; real API behavior still needs a deployed backend and manual test requests.


## Supabase Authentication

The frontend uses Supabase Auth for email/password signup, sign-in, email confirmation, password reset, persistent browser sessions, and sign-out.

1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and the **Publishable key** (or legacy anon key). Never use the service-role/secret key in the browser.
3. Put the values in `public/auth-config.js`:
   - `supabaseUrl`: Project URL
   - `publishableKey`: Publishable key
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the production frontend URL and add the production frontend URL plus its preview URL to Redirect URLs.
5. In the backend host environment, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same project URL and publishable key. These backend values are used to ask Supabase to validate the user's bearer access token before citizen reports can be created or read.
6. Redeploy the frontend and backend after setting these values.

The publishable/anon key is intended for browser use. A Supabase service-role or secret key must never be placed in frontend files or exposed to users. Email confirmation behavior is controlled in the Supabase Auth settings.

Citizen report submissions require a signed-in account. The Flask API validates the bearer token with Supabase and scopes the report list to the authenticated user ID. The SQLite report store remains demo storage; on serverless/ephemeral hosts it is not durable across instance replacement. Use a persistent database for production report retention.
