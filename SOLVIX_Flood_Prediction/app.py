"""
AI-Based Flood Prediction & Risk Mapping System
Flask Backend Application
Team: SOLVIX (SY501)
MIT ADT University

This Flask app serves the flood prediction web interface and provides
a REST API endpoint for rule-based flood risk assessment.
NOTE: The risk assessment uses rule-based logic (not a trained ML model).
The train_model.py script can train a Random Forest model if sufficient
data is provided, but the web demo uses the rule-based approach.
"""

import os
import json
import sqlite3
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Sample demonstration data (NOT real environmental data)
# ---------------------------------------------------------------------------
DEMO_LOCATIONS = [
    {
        "name": "Pune City Centre", "lat": 18.5204, "lng": 73.8567,
        "rainfall": 85, "floodDepth": 1.2, "risk": "high",
        "riskScore": 68, "waterLevel": 8.7,
        "desc": "High rainfall causing elevated river levels near Mula-Mutha basin.",
    },
    {
        "name": "Mumbai Coastal Area", "lat": 19.0760, "lng": 72.8777,
        "rainfall": 120, "floodDepth": 2.1, "risk": "vhigh",
        "riskScore": 85, "waterLevel": 11.2,
        "desc": "Very high risk due to heavy monsoon and low-lying coastal terrain.",
    },
    {
        "name": "Chennai Flood Zone", "lat": 13.0827, "lng": 80.2707,
        "rainfall": 95, "floodDepth": 1.5, "risk": "high",
        "riskScore": 72, "waterLevel": 9.4,
        "desc": "Cyclonic rainfall overwhelming urban drainage systems.",
    },
    {
        "name": "Kolkata Lowlands", "lat": 22.5726, "lng": 88.3639,
        "rainfall": 70, "floodDepth": 0.8, "risk": "moderate",
        "riskScore": 52, "waterLevel": 7.1,
        "desc": "Moderate risk with elevated Hooghly river levels after sustained rain.",
    },
    {
        "name": "Bengaluru Tech Corridor", "lat": 12.9716, "lng": 77.5946,
        "rainfall": 45, "floodDepth": 0.3, "risk": "low",
        "riskScore": 28, "waterLevel": 5.2,
        "desc": "Low risk - moderate rainfall with adequate drainage infrastructure.",
    },
    {
        "name": "Guwahati Riverside", "lat": 26.1445, "lng": 91.7362,
        "rainfall": 110, "floodDepth": 1.8, "risk": "vhigh",
        "riskScore": 80, "waterLevel": 10.5,
        "desc": "Brahmaputra swelling above warning level near urban settlements.",
    },
    {
        "name": "Hyderabad Core", "lat": 17.3850, "lng": 78.4867,
        "rainfall": 55, "floodDepth": 0.5, "risk": "moderate",
        "riskScore": 45, "waterLevel": 6.3,
        "desc": "Moderate risk due to occasional cloudburst activity.",
    },
    {
        "name": "Surat Flood Plains", "lat": 21.1702, "lng": 72.8311,
        "rainfall": 75, "floodDepth": 1.0, "risk": "moderate",
        "riskScore": 55, "waterLevel": 8.0,
        "desc": "Tapi river elevated after upstream releases from Ukai dam.",
    },
    {
        "name": "Patna Ganga Banks", "lat": 25.5941, "lng": 85.1376,
        "rainfall": 100, "floodDepth": 1.6, "risk": "high",
        "riskScore": 75, "waterLevel": 10.1,
        "desc": "Ganga flowing above danger mark in multiple ghats.",
    },
    {
        "name": "Jaipur Dry Zone", "lat": 26.9124, "lng": 75.7873,
        "rainfall": 20, "floodDepth": 0.1, "risk": "low",
        "riskScore": 15, "waterLevel": 3.5,
        "desc": "Low risk - arid terrain with minimal rainfall activity.",
    },
]

DEMO_ALERTS = [
    {
        "id": 1, "level": "vhigh", "location": "Mumbai Coastal Area",
        "title": "Very High Flood Risk Alert",
        "time": "2026-10-09 14:32 IST",
        "desc": "Very high risk detected due to 120mm rainfall and 2.1m flood depth in low-lying coastal areas.",
        "action": "Evacuate low-lying areas immediately",
    },
    {
        "id": 2, "level": "high", "location": "Guwahati Riverside",
        "title": "High Flood Risk Alert",
        "time": "2026-10-09 13:15 IST",
        "desc": "Brahmaputra river at 10.5m, approaching danger level. 110mm rainfall in last 24 hours.",
        "action": "Move to higher ground, avoid riverbanks",
    },
    {
        "id": 3, "level": "high", "location": "Patna Ganga Banks",
        "title": "High Flood Risk Alert",
        "time": "2026-10-09 12:45 IST",
        "desc": "Ganga flowing above warning mark. 100mm rainfall with 1.6m flood depth in floodplain areas.",
        "action": "Prepare for evacuation, monitor updates",
    },
    {
        "id": 4, "level": "moderate", "location": "Kolkata Lowlands",
        "title": "Moderate Flood Risk Notification",
        "time": "2026-10-09 10:20 IST",
        "desc": "Hooghly river at 7.1m after sustained rainfall. Urban waterlogging in low-lying neighborhoods.",
        "action": "Avoid waterlogged areas, stay informed",
    },
    {
        "id": 5, "level": "low", "location": "Jaipur Dry Zone",
        "title": "Low Risk Status",
        "time": "2026-10-09 09:00 IST",
        "desc": "Conditions normal. Only 20mm rainfall. River levels stable at 3.5m.",
        "action": "No action required - standard monitoring",
    },
]

DATASETS = [
    {"name": "Rainfall Records", "category": "Rainfall data", "source": "Sample dataset (demo)", "status": "Current", "missing": "None"},
    {"name": "River Water Levels", "category": "Water-level data", "source": "Sample dataset (demo)", "status": "Current", "missing": "None"},
    {"name": "Flood Depth Estimates", "category": "Flood-depth data", "source": "Sample dataset (demo)", "status": "Current", "missing": "Partial"},
    {"name": "Elevation Models", "category": "Elevation data", "source": "SRTM (public, demo)", "status": "Pending", "missing": "Partial"},
    {"name": "Terrain & GIS Layers", "category": "Terrain/GIS data", "source": "OpenStreetMap (demo)", "status": "Current", "missing": "None"},
    {"name": "Live Sensor Feed", "category": "Real-time data", "source": "Not connected", "status": "Unavailable", "missing": "All"},
]

# Chart demonstration data
CHART_DATA = {
    "rainfall_trend": {"labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "values": [45, 62, 38, 85, 110, 72, 55]},
    "river_trend": {"labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "values": [5.2, 6.1, 6.8, 7.5, 8.7, 9.2, 8.4]},
    "flood_depth": {"labels": ["Pune", "Mumbai", "Chennai", "Kolkata", "Bengaluru", "Guwahati"], "values": [1.2, 2.1, 1.5, 0.8, 0.3, 1.8]},
    "risk_distribution": {"labels": ["Low Risk", "Moderate Risk", "High Risk", "Very High Risk"], "values": [3, 3, 3, 2]},
}


# ---------------------------------------------------------------------------
# Rule-based flood risk calculation
# ---------------------------------------------------------------------------
def calculate_risk(rainfall, temperature, humidity, river_level, flood_depth, elevation):
    """
    Calculate a demonstration flood risk score using rule-based thresholds.
    This is NOT a trained AI/ML model prediction.
    Returns: dict with score, category, label, and safety recommendations.
    """
    score = 0

    # Rainfall scoring (max 60 pts)
    if rainfall > 150:
        score += 60
    elif rainfall > 100:
        score += 45
    elif rainfall > 60:
        score += 30
    elif rainfall > 30:
        score += 15
    else:
        score += 5

    # Humidity scoring (max 15 pts)
    if humidity > 85:
        score += 15
    elif humidity > 70:
        score += 10
    elif humidity > 50:
        score += 5

    # River water level scoring (max 20 pts)
    if river_level > 10:
        score += 20
    elif river_level > 7:
        score += 15
    elif river_level > 4:
        score += 8
    else:
        score += 2

    # Flood depth scoring (max 20 pts)
    if flood_depth > 2:
        score += 20
    elif flood_depth > 1:
        score += 15
    elif flood_depth > 0.5:
        score += 8
    else:
        score += 3

    # Elevation scoring (lower elevation = higher risk, max 15 pts)
    if elevation < 100:
        score += 15
    elif elevation < 300:
        score += 10
    elif elevation < 600:
        score += 5

    # Temperature factor (minor adjustment)
    if temperature > 30 and humidity > 80:
        score += 5
    elif temperature > 35:
        score += 3

    # Categorize
    if score >= 75:
        category, label = "vhigh", "Very High Risk"
    elif score >= 50:
        category, label = "high", "High Risk"
    elif score >= 30:
        category, label = "moderate", "Moderate Risk"
    else:
        category, label = "low", "Low Risk"

    safety = get_safety_recommendations(category)

    return {
        "score": score,
        "category": category,
        "label": label,
        "safety_recommendations": safety,
    }


def get_safety_recommendations(category):
    """Return safety recommendations based on risk category."""
    recs = {
        "vhigh": [
            "Evacuate immediately to higher ground",
            "Do not attempt to drive through flooded roads",
            "Follow official emergency instructions",
            "Move to designated relief shelters",
            "Keep emergency supplies and documents ready",
        ],
        "high": [
            "Stay alert and monitor weather updates",
            "Avoid low-lying areas and riverbanks",
            "Prepare for possible evacuation",
            "Keep emergency contacts accessible",
            "Secure important belongings on upper floors",
        ],
        "moderate": [
            "Stay informed about weather conditions",
            "Avoid unnecessary travel during heavy rain",
            "Check local drainage and flood barriers",
            "Keep emergency kit prepared",
            "Monitor river water levels",
        ],
        "low": [
            "Conditions are relatively safe",
            "Continue monitoring weather updates",
            "Maintain standard preparedness",
            "Report any unusual water level changes",
            "Keep drainage systems clear",
        ],
    }
    return recs.get(category, recs["low"])


# ---------------------------------------------------------------------------
# Optional: Try to load trained ML model if it exists
# ---------------------------------------------------------------------------
ML_MODEL = None
ML_SCALER = None

def load_ml_model():
    """Attempt to load a trained model if model files exist."""
    global ML_MODEL, ML_SCALER
    model_path = os.path.join(os.path.dirname(__file__), "models", "flood_risk_model.pkl")
    scaler_path = os.path.join(os.path.dirname(__file__), "models", "scaler.pkl")
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        try:
            import joblib
            ML_MODEL = joblib.load(model_path)
            ML_SCALER = joblib.load(scaler_path)
            return True
        except Exception:
            return False
    return False

ML_AVAILABLE = load_ml_model()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")


@app.route("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "ml_model_loaded": ML_AVAILABLE,
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/api/locations")
def locations():
    """Return demonstration locations for the GIS map."""
    return jsonify({"locations": DEMO_LOCATIONS, "demo": True})


@app.route("/api/alerts")
def alerts():
    """Return demonstration alerts."""
    return jsonify({"alerts": DEMO_ALERTS, "demo": True})


@app.route("/api/datasets")
def datasets():
    """Return dataset status information."""
    return jsonify({"datasets": DATASETS, "demo": True})


@app.route("/api/chart-data")
def chart_data():
    """Return chart demonstration data."""
    return jsonify({"charts": CHART_DATA, "demo": True})


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Flood risk prediction endpoint.
    Accepts JSON with: location, rainfall, temperature, humidity,
    river_level, flood_depth, elevation.
    Returns risk score, category, and safety recommendations.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Extract and validate parameters
        location = str(data.get("location", "")).strip()
        rainfall = float(data.get("rainfall", 0))
        temperature = float(data.get("temperature", 25))
        humidity = float(data.get("humidity", 50))
        river_level = float(data.get("river_level", 5))
        flood_depth = float(data.get("flood_depth", 0))
        elevation = float(data.get("elevation", 500))

        if len(location) < 2:
            return jsonify({"error": "Location name must be at least 2 characters"}), 400

        # Validate ranges
        if not (0 <= rainfall <= 500):
            return jsonify({"error": "Rainfall must be between 0 and 500 mm"}), 400
        if not (-20 <= temperature <= 60):
            return jsonify({"error": "Temperature must be between -20 and 60 C"}), 400
        if not (0 <= humidity <= 100):
            return jsonify({"error": "Humidity must be between 0 and 100%"}), 400
        if not (0 <= river_level <= 50):
            return jsonify({"error": "River level must be between 0 and 50 m"}), 400
        if not (0 <= flood_depth <= 20):
            return jsonify({"error": "Flood depth must be between 0 and 20 m"}), 400
        if not (0 <= elevation <= 9000):
            return jsonify({"error": "Elevation must be between 0 and 9000 m"}), 400

        # Calculate risk using rule-based logic
        result = calculate_risk(
            rainfall, temperature, humidity, river_level, flood_depth, elevation
        )

        # If ML model is available, also provide ML prediction
        ml_prediction = None
        if ML_AVAILABLE and ML_MODEL and ML_SCALER:
            try:
                import numpy as np
                features = np.array([[rainfall, temperature, humidity, river_level, flood_depth, elevation]])
                features_scaled = ML_SCALER.transform(features)
                ml_prediction = int(ML_MODEL.predict(features_scaled)[0])
            except Exception:
                ml_prediction = None

        response = {
            "location": location,
            "inputs": {
                "rainfall": rainfall,
                "temperature": temperature,
                "humidity": humidity,
                "river_level": river_level,
                "flood_depth": flood_depth,
                "elevation": elevation,
            },
            "risk_score": result["score"],
            "risk_category": result["category"],
            "risk_label": result["label"],
            "safety_recommendations": result["safety_recommendations"],
            "timestamp": datetime.now().isoformat(),
            "demo": True,
            "method": "rule-based",
            "disclaimer": "This is a rule-based demonstration assessment, not a trained AI prediction or an official flood warning.",
        }

        if ml_prediction is not None:
            response["ml_prediction"] = ml_prediction
            response["method"] = "rule-based + ml-model"

        return jsonify(response)

    except ValueError as e:
        return jsonify({"error": f"Invalid input: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500



# ---------------------------------------------------------------------------
# Citizen reporting and AI safety assistant
# ---------------------------------------------------------------------------
def get_reports_db():
    """Return a SQLite connection for citizen reports.

    Set FLOODLENS_DB_PATH to a persistent disk path in production. The default
    path is suitable for local development; ephemeral serverless filesystems
    may not retain data across deployments or cold starts.
    """
    default_dir = os.path.join(os.path.dirname(__file__), "instance")
    os.makedirs(default_dir, exist_ok=True)
    db_path = os.environ.get(
        "FLOODLENS_DB_PATH",
        os.path.join(default_dir, "floodlens_reports.sqlite3"),
    )
    connection = sqlite3.connect(db_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS citizen_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_code TEXT NOT NULL UNIQUE,
            location TEXT NOT NULL,
            incident_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    # Upgrade databases created before account-backed reports were introduced.
    existing_columns = {
        row["name"]
        for row in connection.execute("PRAGMA table_info(citizen_reports)").fetchall()
    }
    if "user_id" not in existing_columns:
        connection.execute("ALTER TABLE citizen_reports ADD COLUMN user_id TEXT")
    connection.commit()
    return connection


@app.after_request
def add_api_cors_headers(response):
    """Allow the configured Vercel frontend to call this Flask API."""
    origin = request.headers.get("Origin")
    allowed_origins = [
        value.strip()
        for value in os.environ.get("FRONTEND_ORIGINS", "").split(",")
        if value.strip()
    ]
    if origin and (not allowed_origins or origin in allowed_origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response



def get_supabase_user_from_request():
    """Validate a Supabase access token using Supabase Auth's user endpoint."""
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    publishable_key = (
        os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
        or os.environ.get("SUPABASE_ANON_KEY", "").strip()
    )
    if not supabase_url or not publishable_key:
        return None, (
            jsonify({"error": "Supabase authentication is not configured on the backend."}),
            503,
        )

    authorization = request.headers.get("Authorization", "")
    scheme, _, access_token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not access_token.strip():
        return None, (jsonify({"error": "Sign in is required to submit a report."}), 401)

    user_request = urllib.request.Request(
        supabase_url + "/auth/v1/user",
        headers={
            "apikey": publishable_key,
            "Authorization": "Bearer " + access_token.strip(),
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(user_request, timeout=8) as response:
            user = json.loads(response.read().decode("utf-8"))
        user_id = str(user.get("id", "")).strip()
        if not user_id:
            return None, (jsonify({"error": "Supabase did not return a valid user."}), 401)
        return {"id": user_id, "email": user.get("email")}, None
    except urllib.error.HTTPError as error:
        if error.code in (400, 401, 403):
            return None, (jsonify({"error": "Your sign-in session is invalid or expired. Please sign in again."}), 401)
        app.logger.warning("Supabase user verification returned HTTP %s", error.code)
        return None, (jsonify({"error": "Authentication service is temporarily unavailable."}), 502)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        app.logger.exception("Could not verify the Supabase access token")
        return None, (jsonify({"error": "Could not verify your sign-in right now. Try again."}), 502)



@app.route("/api/reports", methods=["GET", "POST", "OPTIONS"])
def create_citizen_report():
    """Store a validated citizen flood observation.

    Reports are observations, not verified emergency alerts. Contact details
    are intentionally not collected or stored by this API.
    """
    if request.method == "OPTIONS":
        return ("", 204)

    authenticated_user, auth_error = get_supabase_user_from_request()
    if auth_error:
        return auth_error

    if request.method == "GET":
        connection = None
        try:
            connection = get_reports_db()
            rows = connection.execute(
                """
                SELECT report_code, location, incident_type, severity, description, created_at
                FROM citizen_reports
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 100
                """,
                (authenticated_user["id"],),
            ).fetchall()
            return jsonify({"reports": [dict(row) for row in rows], "count": len(rows)})
        except sqlite3.Error:
            app.logger.exception("Could not read citizen flood reports")
            return jsonify({"error": "Report storage is temporarily unavailable."}), 503
        finally:
            if connection is not None:
                connection.close()

    data = request.get_json(silent=True) or {}
    location = str(data.get("location", "")).strip()
    incident_type = str(data.get("type", "")).strip()
    severity = str(data.get("severity", "")).strip()
    description = str(data.get("description", "")).strip()

    allowed_types = {
        "waterlogging", "river_overflow", "urban_flooding",
        "drain_blockage", "road_inundation", "other",
    }
    allowed_severities = {"low", "moderate", "high", "very_high"}

    if not location or len(location) > 200:
        return jsonify({"error": "Location is required and must be 200 characters or fewer."}), 400
    if incident_type not in allowed_types:
        return jsonify({"error": "Choose a valid incident type."}), 400
    if severity not in allowed_severities:
        return jsonify({"error": "Choose a valid severity."}), 400
    if not description or len(description) > 800:
        return jsonify({"error": "Description is required and must be 800 characters or fewer."}), 400

    report_code = "FLR-" + datetime.utcnow().strftime("%Y%m%d%H%M%S") + "-" + os.urandom(3).hex().upper()
    created_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    connection = None
    try:
        connection = get_reports_db()
        connection.execute(
            """
            INSERT INTO citizen_reports
                (report_code, location, incident_type, severity, description, created_at, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_code, location, incident_type, severity, description,
                created_at, authenticated_user["id"],
            ),
        )
        connection.commit()
    except sqlite3.Error:
        app.logger.exception("Could not save citizen flood report")
        return jsonify({"error": "Report storage is temporarily unavailable."}), 503
    finally:
        if connection is not None:
            connection.close()

    return jsonify({
        "report_id": report_code,
        "created_at": created_at,
        "status": "received_by_demo_backend",
        "message": "The observation was saved. It has not been verified or forwarded to emergency services.",
    }), 201


@app.route("/api/chat", methods=["POST", "OPTIONS"])
def flood_safety_chat():
    """Generate a flood-safety response using the Gemini Developer API.

    Configure GEMINI_API_KEY on the backend host. The key is never exposed
    to the browser or returned in API responses.
    """
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    if not message or len(message) > 500:
        return jsonify({"error": "Message is required and must be 500 characters or fewer."}), 400

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({
            "error": "Gemini assistant is not configured on the backend.",
            "fallback_available": True,
        }), 503

    model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash").strip()
    if not model or len(model) > 100:
        return jsonify({"error": "Gemini model configuration is invalid."}), 500

    system_instruction = (
        "You are FloodLens, a concise flood-preparedness information assistant. "
        "Prioritize life safety. Never claim to dispatch responders, issue official warnings, "
        "or know live local conditions unless provided in the conversation. For immediate danger, "
        "tell the person to contact their local emergency number and disaster-management authority. "
        "Advise people never to walk or drive through floodwater. Direct users to official local "
        "authorities for evacuation instructions and verified shelter locations. Clearly distinguish "
        "general guidance from verified live data. Do not invent phone numbers, shelters, road closures, "
        "or flood levels. Keep answers practical and calm."
    )

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [{
            "role": "user",
            "parts": [{"text": message}]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 450
        }
    }
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        + urllib.parse.quote(model, safe="-._")
        + ":generateContent"
    )
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            result = json.loads(response.read().decode("utf-8"))

        candidates = result.get("candidates") or []
        if not candidates:
            return jsonify({
                "error": "Gemini did not return a response. Please rephrase and try again."
            }), 502

        parts = candidates[0].get("content", {}).get("parts", [])
        reply = "\n".join(
            part.get("text", "")
            for part in parts
            if isinstance(part, dict) and part.get("text")
        ).strip()

        if not reply:
            return jsonify({"error": "Gemini returned an empty or blocked response."}), 502

        return jsonify({"reply": reply, "model": model, "provider": "gemini", "demo": False})

    except urllib.error.HTTPError as error:
        app.logger.warning("Gemini API returned HTTP %s", error.code)
        if error.code == 429:
            return jsonify({"error": "Gemini rate limit reached. Please try again shortly."}), 429
        if error.code in (401, 403):
            return jsonify({"error": "Gemini API authentication failed. Check the backend GEMINI_API_KEY."}), 502
        return jsonify({"error": "Gemini could not complete the request."}), 502
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        app.logger.exception("FloodLens Gemini request failed")
        return jsonify({"error": "Gemini is temporarily unavailable. Please try again."}), 503


if __name__ == "__main__":
    print("=" * 60)
    print("  AI-Based Flood Prediction & Risk Mapping System")
    print("  Team: SOLVIX (SY501) | MIT ADT University")
    print("=" * 60)
    print(f"  ML Model loaded: {ML_AVAILABLE}")
    print(f"  Risk assessment: {'rule-based + ML' if ML_AVAILABLE else 'rule-based only'}")
    print("  Starting server at: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", host="0.0.0.0", port=int(os.environ.get("PORT", "5000")) )
