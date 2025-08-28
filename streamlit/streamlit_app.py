# streamlit_app.py
# Streamlit UI for the Arconic PCS rolling-mill demo
# - Calls your Node/Express backend (default http://localhost:4000)
# - Version-safe welcome card (no st.modal / st.dialog)
# - KPIs, trends, insights, defects, shift report

import os
from pathlib import Path
import requests
import pandas as pd
import altair as alt
import streamlit as st

# ---- optional auto-refresh (safe fallback if package missing) ----
try:
    from streamlit_autorefresh import st_autorefresh
except Exception:
    def st_autorefresh(*args, **kwargs):
        return None

# ---- optional .env loader (safe if missing) ----
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).with_name(".env"))
except Exception:
    pass

# ------------------------ App configuration ------------------------
st.set_page_config(page_title="Arconic PCS Telemetry — Streamlit", layout="wide")

# Thresholds (same idea as your React app)
LIMITS = {
    "temperature": {"warn": 700, "crit": 750},        # °F
    "vibration":   {"warn": 1.8, "crit": 2.5},        # mm/s
    "throughput":  {"warnLow": 260, "critLow": 220},  # units/hr (low is bad)
    "defects":     {"warn": 2.0, "crit": 3.0},        # %
}

DEFAULT_BASE = os.getenv("PCS_API_BASE", "http://localhost:4000")

# ------------------------ Session state & Welcome ------------------------
if "base_url" not in st.session_state:
    st.session_state["base_url"] = DEFAULT_BASE
if "show_welcome" not in st.session_state:
    st.session_state["show_welcome"] = True

def close_welcome():
    st.session_state["show_welcome"] = False

def welcome_card():
    with st.container():
        st.markdown("### Welcome to the Rolling Mill PCS Demo")
        st.write(
            "This app shows **simulated PCS telemetry** (temperature, vibration, throughput) "
            "from a rolling mill. Data flows **OT → Edge → DMZ Ingest API → SQLite (IT)**. "
            "This UI **queries an internal API** to display real-time and historical data."
        )
        st.write("**How to read the page**")
        st.markdown(
            "- **KPIs**: current values with health badges\n"
            "- **Trends**: last N readings with thresholds\n"
            "- **Insights**: plain-English alerts that matter now\n"
            "- **Defects**: log & flag batches\n"
            "- **Shift report**: aggregated metrics by shift"
        )
        st.caption("All data is simulated. No proprietary Arconic data is used.")
        st.button("Start monitoring", on_click=close_welcome)
        st.markdown("---")

if st.session_state["show_welcome"]:
    welcome_card()

# ------------------------ Sidebar controls ------------------------
st.sidebar.title("Controls")
st.sidebar.text_input("Backend base URL", value=st.session_state["base_url"], key="base_url")
BASE_URL = st.session_state["base_url"]

auto = st.sidebar.checkbox("Auto-refresh", value=True)
secs = st.sidebar.slider("Refresh interval (seconds)", 2, 15, 3)
if auto:
    st_autorefresh(interval=secs * 1000, key="autorefresh-key")

limit = st.sidebar.select_slider("History window (points)", options=[150, 450, 900], value=150)

st.sidebar.markdown("---")
st.sidebar.markdown("**Thresholds**")
st.sidebar.json(LIMITS)

# ------------------------ API helpers ------------------------
def fetch_json(path, params=None, method="GET", json=None, timeout=6):
    url = f"{BASE_URL}{path}"
    try:
        r = requests.request(method, url, params=params, json=json, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        st.error(f"API error for {path}: {e}")
        return None

def api_health_ok():
    return fetch_json("/api/history", params={"limit": 1}) is not None

def get_history(limit_points=150):
    data = fetch_json("/api/history", params={"limit": limit_points})
    if not data:
        return pd.DataFrame(columns=["ts", "temperature", "vibration", "throughput", "defects"])
    df = pd.DataFrame(data)
    df["ts"] = pd.to_datetime(df["ts"])
    return df

def get_defects(flagged=None):
    params = {}
    if flagged is not None:
        params["flagged"] = 1 if flagged else 0
    data = fetch_json("/api/defects", params=params) or []
    return pd.DataFrame(data)

def add_defect(batch_id, machine, defect_type, rate, flagged):
    body = {
        "batch_id": batch_id,
        "machine": machine,
        "defect_type": defect_type,
        "rate": rate,
        "flagged": flagged,
    }
    return fetch_json("/api/defects", method="POST", json=body)

def get_shift_report(date_str=None):
    params = {"date": date_str} if date_str else None
    return fetch_json("/api/reports/shift", params=params) or {"rows": []}

# ------------------------ KPI helpers ------------------------
def kpi_state(metric, value):
    if value is None:
        return "unknown"
    if metric == "throughput":
        if value <= LIMITS["throughput"]["critLow"]:
            return "critical"
        if value <= LIMITS["throughput"]["warnLow"]:
            return "watch"
        return "ok"
    lim = LIMITS[metric]
    if value >= lim["crit"]:
        return "critical"
    if value >= lim["warn"]:
        return "watch"
    return "ok"

def badge_style(state):
    styles = {
        "ok": "background-color:#DCFCE7; padding:2px 8px; border-radius:999px;",
        "watch": "background-color:#FEF9C3; padding:2px 8px; border-radius:999px;",
        "critical": "background-color:#FEE2E2; padding:2px 8px; border-radius:999px;",
        "unknown": "background-color:#e5e7eb; padding:2px 8px; border-radius:999px;",
    }
    return styles.get(state, styles["unknown"])

# ------------------------ Header & status ------------------------
st.title("Arconic PCS Telemetry Dashboard — Streamlit")
st.caption("Real-time monitoring & defect analytics for Rolling Mill RM-01 (simulated).")

api_ok = api_health_ok()
st.markdown(
    f"**API:** "
    f"<span style='padding:2px 8px; border-radius:999px; background:#{'DCFCE7' if api_ok else 'FEE2E2'}'>"
    f"{'ok' if api_ok else 'down'}</span> &nbsp;&nbsp; "
    f"**Base URL:** `{BASE_URL}`",
    unsafe_allow_html=True,
)

# ------------------------ Data load ------------------------
hist = get_history(limit)
last = hist.iloc[-1] if not hist.empty else None

# ------------------------ KPIs ------------------------
c1, c2, c3, c4 = st.columns(4)

def show_kpi(col, title, key):
    with col:
        val = None if last is None else float(last[key])
        state = kpi_state(key, val)
        st.markdown(f"**{title}**")
        st.markdown(
            f"<span style='font-size:28px; font-weight:700'>{'-' if val is None else f'{val:,.2f}'}</span>",
            unsafe_allow_html=True,
        )
        st.markdown(f"<span style='{badge_style(state)}'>{state}</span>", unsafe_allow_html=True)

show_kpi(c1, "Work-Roll Temperature (°F)", "temperature")
show_kpi(c2, "Bearing Vibration (mm/s)", "vibration")
show_kpi(c3, "Line Throughput (units/hr)", "throughput")
show_kpi(c4, "Surface Defects (%)", "defects")

# ------------------------ Charts ------------------------
def line_with_limits(df, y, warn=None, crit=None, warn_low=None, crit_low=None):
    if df.empty:
        return alt.Chart(pd.DataFrame({"ts": [], y: []})).mark_line()
    base = alt.Chart(df).encode(x=alt.X("ts:T", title="Time"))
    line = base.mark_line().encode(y=alt.Y(f"{y}:Q", title=y.title()))
    layers = [line]
    # Threshold guide lines
    if warn is not None:
        layers.append(base.mark_rule(strokeDash=[6, 6]).encode(y=alt.datum(warn), color=alt.value("#9ca3af")))
    if crit is not None:
        layers.append(base.mark_rule(strokeDash=[6, 6]).encode(y=alt.datum(crit), color=alt.value("#9ca3af")))
    if warn_low is not None:
        layers.append(base.mark_rule(strokeDash=[6, 6]).encode(y=alt.datum(warn_low), color=alt.value("#9ca3af")))
    if crit_low is not None:
        layers.append(base.mark_rule(strokeDash=[6, 6]).encode(y=alt.datum(crit_low), color=alt.value("#9ca3af")))
    return alt.layer(*layers).properties(height=230)

st.markdown("### Trends")
lc1, lc2 = st.columns(2)
with lc1:
    st.altair_chart(
        line_with_limits(hist, "temperature",
                         warn=LIMITS["temperature"]["warn"], crit=LIMITS["temperature"]["crit"]),
        use_container_width=True,
    )
with lc2:
    st.altair_chart(
        line_with_limits(hist, "vibration",
                         warn=LIMITS["vibration"]["warn"], crit=LIMITS["vibration"]["crit"]),
        use_container_width=True,
    )
lc3, lc4 = st.columns(2)
with lc3:
    st.altair_chart(
        line_with_limits(hist, "throughput",
                         warn_low=LIMITS["throughput"]["warnLow"], crit_low=LIMITS["throughput"]["critLow"]),
        use_container_width=True,
    )
with lc4:
    st.altair_chart(
        line_with_limits(hist, "defects",
                         warn=LIMITS["defects"]["warn"], crit=LIMITS["defects"]["crit"]),
        use_container_width=True,
    )

# ------------------------ Insights ------------------------
st.markdown("### Insights — What matters now")
if last is None:
    st.info("Waiting for data… (start your backend on :4000 or set the Base URL in the sidebar).")
else:
    notes = []
    def note(cond, title, detail): 
        if cond: notes.append((title, detail))

    note(last["temperature"] >= LIMITS["temperature"]["crit"],
         "Temperature CRITICAL", f"Now {last['temperature']:.2f} °F (≥ {LIMITS['temperature']['crit']})")
    note(last["temperature"] >= LIMITS["temperature"]["warn"],
         "Temperature high", f"Now {last['temperature']:.2f} °F (≥ {LIMITS['temperature']['warn']})")
    note(last["vibration"] >= LIMITS["vibration"]["crit"],
         "Vibration CRITICAL", f"Now {last['vibration']:.2f} mm/s (≥ {LIMITS['vibration']['crit']})")
    note(last["vibration"] >= LIMITS["vibration"]["warn"],
         "Vibration elevated", f"Now {last['vibration']:.2f} mm/s (≥ {LIMITS['vibration']['warn']})")
    note(last["throughput"] <= LIMITS["throughput"]["critLow"],
         "Throughput CRITICAL (low)", f"Now {last['throughput']:.0f} (≤ {LIMITS['throughput']['critLow']})")
    note(last["throughput"] <= LIMITS["throughput"]["warnLow"],
         "Throughput low", f"Now {last['throughput']:.0f} (≤ {LIMITS['throughput']['warnLow']})")
    note(last["defects"] >= LIMITS["defects"]["crit"],
         "Defects CRITICAL", f"Now {last['defects']:.2f}% (≥ {LIMITS['defects']['crit']})")
    note(last["defects"] >= LIMITS["defects"]["warn"],
         "Defects high", f"Now {last['defects']:.2f}% (≥ {LIMITS['defects']['warn']})")

    if not notes:
        st.success("All metrics nominal.")
    else:
        for t, d in notes:
            st.warning(f"**{t}** — {d}")

# ------------------------ Defect Logs ------------------------
st.markdown("### Defect Logs")
df_def = get_defects()
st.dataframe(df_def, use_container_width=True, hide_index=True)

with st.expander("Add defect"):
    with st.form("add_defect_form", clear_on_submit=True):
        colA, colB, colC, colD, colE = st.columns([1, 1, 1, 1, 1])
        batch_id = colA.text_input("Batch ID", "B2025-301")
        machine  = colB.text_input("Machine", "RM-01")
        dtype    = colC.selectbox("Defect type", ["Edge Crack", "Surface Scratch", "Thickness Error", "Other"])
        rate     = colD.number_input("Rate %", min_value=0.0, max_value=100.0, value=0.5, step=0.1)
        flagged  = colE.checkbox("Flagged", value=True)
        submitted = st.form_submit_button("Add")
        if submitted:
            res = add_defect(batch_id, machine, dtype, rate, flagged)
            if res:
                st.success("Defect added.")
                st.experimental_rerun()

# ------------------------ Shift Report ------------------------
st.markdown("### Shift Report")
rep = get_shift_report()
rows = rep.get("rows", [])
if rows:
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
else:
    st.info("No shift data yet.")

st.caption(f"Simulated data; backend: {BASE_URL}")
