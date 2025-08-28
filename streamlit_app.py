# streamlit_app.py
import os, requests, pandas as pd, altair as alt
import streamlit as st
from datetime import datetime
from streamlit_autorefresh import st_autorefresh

# ---------- Config ----------
st.set_page_config(page_title="Arconic PCS Telemetry (Streamlit)", layout="wide")
BASE_URL = os.getenv("PCS_API_BASE", "http://localhost:4000")  # your Node backend
LIMITS = {
    "temperature": {"warn": 700, "crit": 750},        # °F
    "vibration":   {"warn": 1.8, "crit": 2.5},        # mm/s
    "throughput":  {"warnLow": 260, "critLow": 220},  # units/hr (low is bad)
    "defects":     {"warn": 2.0, "crit": 3.0},        # %
}

# ---------- Helpers ----------
def fetch_json(path, params=None, method="GET", json=None, timeout=6):
    url = f"{BASE_URL}{path}"
    try:
        r = requests.request(method, url, params=params, json=json, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        st.error(f"API error for {path}: {e}")
        return None

def get_history(limit=150):
    data = fetch_json("/api/history", params={"limit": limit})
    if not data:
        return pd.DataFrame(columns=["ts","temperature","vibration","throughput","defects"])
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
        "batch_id": batch_id, "machine": machine,
        "defect_type": defect_type, "rate": rate, "flagged": flagged
    }
    return fetch_json("/api/defects", method="POST", json=body)

def get_shift_report(date_str=None):
    params = {"date": date_str} if date_str else None
    return fetch_json("/api/reports/shift", params=params) or {"rows": []}

def kpi_badge(metric, value):
    if value is None:
        return "unknown"
    if metric == "throughput":
        if value <= LIMITS["throughput"]["critLow"]:
            return "critical"
        if value <= LIMITS["throughput"]["warnLow"]:
            return "watch"
        return "ok"
    # high is bad
    lim = LIMITS[metric]
    if value >= lim["crit"]: return "critical"
    if value >= lim["warn"]: return "watch"
    return "ok"

def badge_style(state):
    return {
        "ok": "background-color:#DCFCE7; padding:2px 8px; border-radius:999px;",
        "watch": "background-color:#FEF9C3; padding:2px 8px; border-radius:999px;",
        "critical": "background-color:#FEE2E2; padding:2px 8px; border-radius:999px;",
        "unknown": "background-color:#e5e7eb; padding:2px 8px; border-radius:999px;"
    }.get(state, "background-color:#e5e7eb; padding:2px 8px; border-radius:999px;")

# ---------- Sidebar ----------
st.sidebar.title("Controls")
st.sidebar.text_input("Backend base URL", value=BASE_URL, key="base_url")
BASE_URL = st.session_state["base_url"]

auto = st.sidebar.checkbox("Auto-refresh", value=True)
secs = st.sidebar.slider("Refresh interval (seconds)", 2, 15, 3)
if auto:
    st_autorefresh(interval=secs*1000, key="autorefresh-key")

limit = st.sidebar.select_slider("History window (points)", options=[150, 450, 900], value=150)

st.sidebar.markdown("---")
st.sidebar.markdown("**Thresholds**")
st.sidebar.json(LIMITS)

# ---------- Header ----------
st.title("Arconic PCS Telemetry Dashboard — Streamlit")
st.caption("Real-time monitoring & defect analytics for Rolling Mill RM-01 (data simulated).")

# ---------- Data ----------
hist = get_history(limit)
last = hist.iloc[-1] if not hist.empty else None

# ---------- KPIs ----------
c1, c2, c3, c4 = st.columns(4)
def show_kpi(col, title, key, unit=""):
    with col:
        val = None if last is None else float(last[key])
        state = kpi_badge(key, val)
        st.markdown(f"**{title}**  ")
        st.markdown(
            f"<span style='font-size:28px; font-weight:700'>{'-' if val is None else f'{val:,.2f}'}</span>",
            unsafe_allow_html=True,
        )
        st.markdown(f"<span style='{badge_style(state)}'>{state}</span>", unsafe_allow_html=True)

show_kpi(c1, "Work-Roll Temperature (°F)", "temperature")
show_kpi(c2, "Bearing Vibration (mm/s)", "vibration")
show_kpi(c3, "Line Throughput (units/hr)", "throughput")
show_kpi(c4, "Surface Defects (%)", "defects")

# ---------- Charts ----------
def line_with_limits(df, y, warn=None, crit=None, warn_low=None, crit_low=None):
    base = alt.Chart(df).encode(x=alt.X("ts:T", title="Time"))
    line = base.mark_line().encode(y=alt.Y(f"{y}:Q", title=y.title()))
    layers = [line]
    if warn is not None:
        layers.append(base.mark_rule(strokeDash=[6,6]).encode(y=alt.datum(warn), color=alt.value("#999")))
    if crit is not None:
        layers.append(base.mark_rule(strokeDash=[6,6]).encode(y=alt.datum(crit), color=alt.value("#999")))
    if warn_low is not None:
        layers.append(base.mark_rule(strokeDash=[6,6]).encode(y=alt.datum(warn_low), color=alt.value("#999")))
    if crit_low is not None:
        layers.append(base.mark_rule(strokeDash=[6,6]).encode(y=alt.datum(crit_low), color=alt.value("#999")))
    return alt.layer(*layers).properties(height=230)

st.markdown("### Trends")
lc1, lc2 = st.columns(2)
with lc1:
    st.altair_chart(
        line_with_limits(hist, "temperature", warn=LIMITS["temperature"]["warn"], crit=LIMITS["temperature"]["crit"]),
        use_container_width=True
    )
with lc2:
    st.altair_chart(
        line_with_limits(hist, "vibration", warn=LIMITS["vibration"]["warn"], crit=LIMITS["vibration"]["crit"]),
        use_container_width=True
    )
lc3, lc4 = st.columns(2)
with lc3:
    st.altair_chart(
        line_with_limits(hist, "throughput", warn_low=LIMITS["throughput"]["warnLow"], crit_low=LIMITS["throughput"]["critLow"]),
        use_container_width=True
    )
with lc4:
    st.altair_chart(
        line_with_limits(hist, "defects", warn=LIMITS["defects"]["warn"], crit=LIMITS["defects"]["crit"]),
        use_container_width=True
    )

# ---------- Alerts (plain-English insights) ----------
st.markdown("### Insights — What matters now")
if last is None:
    st.info("Waiting for data…")
else:
    notes = []
    def add_note(cond, title, detail):
        if cond: notes.append((title, detail))
    add_note(last["temperature"] >= LIMITS["temperature"]["crit"],
             "Temperature CRITICAL", f"Now {last['temperature']:.2f} °F (≥ {LIMITS['temperature']['crit']})")
    add_note(last["temperature"] >= LIMITS["temperature"]["warn"],
             "Temperature high", f"Now {last['temperature']:.2f} °F (≥ {LIMITS['temperature']['warn']})")
    add_note(last["vibration"] >= LIMITS["vibration"]["crit"],
             "Vibration CRITICAL", f"Now {last['vibration']:.2f} mm/s (≥ {LIMITS['vibration']['crit']})")
    add_note(last["vibration"] >= LIMITS["vibration"]["warn"],
             "Vibration elevated", f"Now {last['vibration']:.2f} mm/s (≥ {LIMITS['vibration']['warn']})")
    add_note(last["throughput"] <= LIMITS["throughput"]["critLow"],
             "Throughput CRITICAL (low)", f"Now {last['throughput']:.0f} (≤ {LIMITS['throughput']['critLow']})")
    add_note(last["throughput"] <= LIMITS["throughput"]["warnLow"],
             "Throughput low", f"Now {last['throughput']:.0f} (≤ {LIMITS['throughput']['warnLow']})")
    add_note(last["defects"] >= LIMITS["defects"]["crit"],
             "Defects CRITICAL", f"Now {last['defects']:.2f}% (≥ {LIMITS['defects']['crit']})")
    add_note(last["defects"] >= LIMITS["defects"]["warn"],
             "Defects high", f"Now {last['defects']:.2f}% (≥ {LIMITS['defects']['warn']})")

    if not notes:
        st.success("All metrics nominal.")
    else:
        for t, d in notes:
            st.warning(f"**{t}** — {d}")

# ---------- Defect Logs ----------
st.markdown("### Defect Logs")
df_def = get_defects()
st.dataframe(df_def, use_container_width=True, hide_index=True)

with st.expander("Add defect"):
    colA, colB, colC, colD, colE = st.columns([1,1,1,1,1])
    batch_id = colA.text_input("Batch ID", "B2025-301")
    machine  = colB.text_input("Machine", "RM-01")
    dtype    = colC.selectbox("Defect type", ["Edge Crack","Surface Scratch","Thickness Error","Other"])
    rate     = colD.number_input("Rate %", min_value=0.0, max_value=100.0, value=0.5, step=0.1)
    flagged  = colE.checkbox("Flagged", value=True)
    if st.button("Add"):
        res = add_defect(batch_id, machine, dtype, rate, flagged)
        if res:
            st.success("Defect added.")
            st.experimental_rerun()

# ---------- Shift Report ----------
st.markdown("### Shift Report")
rep = get_shift_report()
rows = rep.get("rows", [])
if rows:
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
else:
    st.info("No shift data yet.")

st.caption("Data/alerts are simulated; backend at {}".format(BASE_URL))
