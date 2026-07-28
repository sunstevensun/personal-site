import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

/* ============================================================
   ONE HUNDRED COMPANIES — twin Sankeys on a shared time axis.
   Left to right is years. Column width is how long that stage takes;
   lane fill is when that ending took its arrivals.
   ============================================================ */

const N = 100;
const SEC_PER_YEAR = 0.8;
const PXY = 24;                     // pixels per year, everywhere

const INK = "#16191A";
const GROUND = "#E6E7E3";
const PANEL = "#F6F6F3";
const ALIVE = "#14544A";
const CAPITAL = "#B5762A";
const LOST = "#A03A2C";
const MUTED = "#6E7472";
const RULE = "#C9CBC5";
const PENDING = "#A9AEAB";
const CASH = "#16191A";      // ran out of money

const STAGES = [
  { key: "preclinical", short: "PRE-CLINICAL", tag: "PRE-CLINICAL", name: "pre-clinical", c: "#E3C13F", f: "#D2A096" },
  { key: "ind", short: "IND", tag: "IND", name: "IND", c: "#C6BE41", f: "#C4867A" },
  { key: "p1", short: "PHASE I", tag: "PHASE I", name: "Phase I", c: "#9FB846", f: "#B36C5E" },
  { key: "p2", short: "PHASE II", tag: "PHASE II", name: "Phase II", c: "#72AC4E", f: "#A05445" },
  { key: "p3", short: "PHASE III", tag: "PHASE III", name: "Phase III", c: "#4A9E58", f: "#8B3E30" },
  { key: "reg", short: "REGULATORY", tag: "REVIEW", name: "review", c: "#2E9159", f: "#742B1F" },
];
const COLOR = Object.fromEntries(STAGES.map((s) => [s.key, s.c]));
const FAILC = Object.fromEntries(STAGES.map((s) => [s.key, s.f]));

const TAS = {
  all: {
    history: "Not a disease area so much as the industry's weighted average, and it is dominated by whatever fills the pipeline — which for two decades has been oncology. That drags the pooled likelihood of approval down toward 6–7% and hides an enormous spread: the best and worst areas differ by roughly fourfold. Useful as a benchmark, misleading as a plan.",
    name: "All indications",
    note: "Citeline/BIO pooled, 2014–2023. Likelihood of approval from Phase I ≈ 6.7%.",
    p: { preclinical: 0.69, ind: 0.9, p1: 0.47, p2: 0.28, p3: 0.55, reg: 0.92 },
    cost: { preclinical: 3, ind: 1.5, p1: 4, p2: 13, p3: 30, reg: 3 },
    mo: { preclinical: 30, ind: 8, p1: 27.6, p2: 43.2, p3: 39.6, reg: 15.6 },
    opex: { preclinical: 0.12, ind: 0.15, p1: 0.2, p2: 0.3, p3: 0.5, reg: 0.45 },
  },
  onc: {
    history: "The largest share of the industry pipeline and the lowest odds in it. The structural problem is that oncology's early signals are weak predictors: a single-arm Phase II reporting response rate can look convincing and still fail to produce a survival benefit against an active comparator in Phase III. So attrition concentrates late, after the expensive trial has been run — which is why the money leaves this pipeline at the far right. Biomarker-selected populations and accelerated approval have improved the odds in targeted subsets, and FDA's Project Optimus has pushed dose-finding earlier, but the pooled numbers still look like this.",
    name: "Oncology",
    note: "Lowest likelihood of approval of the major areas (~5%). Watch where it narrows: Phase III, after the money is gone.",
    p: { preclinical: 0.69, ind: 0.9, p1: 0.55, p2: 0.283, p3: 0.37, reg: 0.9 },
    cost: { preclinical: 3.5, ind: 1.5, p1: 5, p2: 16, p3: 42, reg: 3 },
    mo: { preclinical: 30, ind: 8, p1: 26, p2: 40, p3: 42, reg: 12 },
    opex: { preclinical: 0.13, ind: 0.16, p1: 0.22, p2: 0.34, p3: 0.58, reg: 0.45 },
  },
  heme: {
    history: 'The most successful major area, for reasons that compound. Targets are often unusually well characterised at the molecular level — BCR-ABL, BTK, CD19, BCMA — so mechanism and disease are tightly linked. Endpoints are objective and read out early: response, remission, minimal residual disease, rather than survival years later. Populations are small and well defined, which brings orphan designation, smaller trials and faster paths. It is the closest thing in the model to what the rest of drug development would look like if target biology were actually understood.',
    name: "Hematology",
    note: "Highest in the BIO dataset (~26%; Citeline's later cut says 19%). Both are in the sources below.",
    p: { preclinical: 0.72, ind: 0.92, p1: 0.7, p2: 0.5, p3: 0.7, reg: 0.92 },
    cost: { preclinical: 3.5, ind: 1.5, p1: 5, p2: 19.6, p3: 35, reg: 3 },
    mo: { preclinical: 30, ind: 8, p1: 26, p2: 40, p3: 38, reg: 14 },
    opex: { preclinical: 0.13, ind: 0.16, p1: 0.22, p2: 0.34, p3: 0.55, reg: 0.45 },
  },
  cv: {
    history: 'A study in mismatched phases. Phase II is comparatively cheap because surrogate endpoints — LDL cholesterol, blood pressure — move fast and read out in modest samples. Phase III then demands cardiovascular outcome trials with tens of thousands of patients followed for years, which is where the budget goes. The field emptied out through the 2000s after a run of high-profile outcome-trial failures made that bet look unaffordable, and refilled only when PCSK9 inhibitors and later the GLP-1 agents showed hard outcome benefit.',
    name: "Cardiovascular",
    note: "Cheap Phase II, brutal Phase III. Outcome trials run large and long.",
    p: { preclinical: 0.69, ind: 0.9, p1: 0.5, p2: 0.3, p3: 0.55, reg: 0.92 },
    cost: { preclinical: 3, ind: 1.5, p1: 4, p2: 7, p3: 60, reg: 3 },
    mo: { preclinical: 30, ind: 8, p1: 28, p2: 44, p3: 54, reg: 16 },
    opex: { preclinical: 0.12, ind: 0.15, p1: 0.2, p2: 0.28, p3: 0.6, reg: 0.45 },
  },
  neuro: {
    history: "The longest timelines and among the least forgiving biology. Efficacy usually rests on subjective rating scales with large placebo responses, so trials must run long with many patients to separate signal from noise. Animal models translate poorly and the blood–brain barrier constrains what can be dosed at all. Alzheimer's is the extreme case: decades of amyloid-targeting failures preceded the recent anti-amyloid approvals, whose effect sizes remain contested. The parameters here are the most punishing in the model and they are not an artefact.",
    name: "Neurology",
    note: "The longest timelines of any major area — roughly 12 years end to end.",
    p: { preclinical: 0.66, ind: 0.9, p1: 0.5, p2: 0.28, p3: 0.5, reg: 0.9 },
    cost: { preclinical: 3, ind: 1.5, p1: 4.5, p2: 15, p3: 45, reg: 3 },
    mo: { preclinical: 34, ind: 9, p1: 30, p2: 48, p3: 48, reg: 18 },
    opex: { preclinical: 0.12, ind: 0.15, p1: 0.2, p2: 0.32, p3: 0.55, reg: 0.45 },
  },
};

const START_YEAR = 2026;
const MARKET = {
  good: { climate: 0.85, label: "Good", tag: "IPO window open, generalists back, rounds close" },
  normal: { climate: 0.6, label: "Normal", tag: "Long-run average — specialists, selective" },
  bad: { climate: 0.3, label: "Bad", tag: "Funding winter, capital scarce, down rounds" },
};

const FAIL_MODES = {
  tox: "Toxicity / safety", efficacy: "Efficacy miss", props: "PK / drug properties",
  commercial: "Commercial or strategic", operational: "Enrollment / operational",
  finance: "Could not raise",
};

const FAIL_MIX = {
  preclinical: [["tox", 0.45], ["props", 0.35], ["efficacy", 0.2]],
  ind: [["tox", 0.5], ["props", 0.3], ["commercial", 0.2]],
  p1: [["tox", 0.6], ["props", 0.3], ["commercial", 0.1]],
  p2: [["efficacy", 0.6], ["tox", 0.2], ["commercial", 0.2]],
  p3: [["efficacy", 0.55], ["tox", 0.2], ["operational", 0.1], ["commercial", 0.15]],
  reg: [["commercial", 0.4], ["tox", 0.3], ["efficacy", 0.3]],
};

const CN = { cost1: 0.38, time1: 0.55, opex: 0.6 };

/* Each switch names a real technique and moves specific bars.
   `mo` multiplies that stage's duration — its bar gets shorter. */
const TIME_SWITCHES = [
  { key: "gen", label: "Generative chemistry & in-silico screening", grade: "B",
    hits: ["preclinical", "ind"],
    mo: { preclinical: 0.6, ind: 0.7 }, cost: { preclinical: 0.5 },
    note: "Model-designed candidates and computational triage before the bench. Shortens the pre-clinical bar — and those candidates then face exactly the same clinical gauntlet." },
  { key: "sites", label: "AI site selection & activation", grade: "C",
    hits: ["p1", "p2", "p3"],
    mo: { p1: 0.88, p2: 0.88, p3: 0.88 }, cost: {},
    note: "Ranking investigator sites on predicted enrollment instead of prior relationships. Vendor-reported, unaudited." },
  { key: "enrol", label: "AI patient matching & enrollment", grade: "C",
    hits: ["p2", "p3"],
    mo: { p2: 0.8, p3: 0.8 }, cost: { p2: 0.92, p3: 0.92 },
    note: "Screening records against protocol criteria to fill cohorts faster. The single biggest cycle-time claim in the vendor literature, and the least audited." },
  { key: "submit", label: "Automated submission drafting", grade: "C",
    hits: ["reg"],
    mo: { reg: 0.8 }, cost: {},
    note: "Generating CSRs and module text from trial data. Real time savings, on the shortest and cheapest stage in the pipeline." },
];

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function pickMode(u, stage) {
  const mix = FAIL_MIX[stage] || FAIL_MIX.p2;
  let r = u;
  for (const [m, w] of mix) { if (r < w) return m; r -= w; }
  return mix[mix.length - 1][0];
}

function effective(params) {
  const T = TAS[params.ta];
  const p = { ...T.p }, cost = { ...T.cost }, mo = { ...T.mo };

  TIME_SWITCHES.forEach((sw) => {
    if (!params[sw.key]) return;
    Object.entries(sw.mo).forEach(([k, v]) => { mo[k] *= v; });
    Object.entries(sw.cost).forEach(([k, v]) => { cost[k] *= v; });
  });

  if (params.aiPh1) p.p1 = 0.85;
  // Genetically supported targets: Nelson 2015 put the lift at ~2x to approval,
  // Minikel/Nelson 2024 at 2.6x, King 2019 confirmed it lands in Phases II and III.
  // 1.45x on each of those two transitions compounds to about 2.1x overall.
  if (params.genetics) {
    p.p2 = clamp(p.p2 * 1.45, 0, 0.62);
    p.p3 = clamp(p.p3 * 1.45, 0, 0.85);
  }

  const moRoute = { ...mo }, costRoute = { ...cost };
  if (params.china) { moRoute.p1 *= CN.time1; costRoute.p1 *= CN.cost1; }
  return { p, cost, mo, moRoute, costRoute, opex: T.opex, T };
}

/* Every company gets a fixed strip of random numbers keyed to (seed, rep, index).
   Both scenarios draw from the same strip, so a difference between them is caused
   by the switches rather than by luck. */
const DPS = 5;   // draws per stage: finance gate, months, cost, pass, failure mode
function companyDraws(seed, rep, i) {
  let s = (seed + rep * 7919) >>> 0;
  s = (s ^ ((i + 1) * 2654435761)) >>> 0;
  const rng = makeRng(s);
  rng(); rng(); rng();                       // warm up past the low-entropy start
  const a = new Array(STAGES.length * DPS);
  for (let k = 0; k < a.length; k++) a[k] = rng();
  return a;
}

function runCohort(params, rep = 0) {
  const { climate, seed, china } = params;
  const { p, moRoute, costRoute, opex, T } = effective(params);

  const companies = [];
  const ledger = {};
  let approvals = 0, totalCapital = 0, lostWinners = 0;
  const benchTotal = STAGES.reduce((a, s) => a + T.mo[s.key], 0);

  for (let i = 0; i < N; i++) {
    const d = companyDraws(seed, rep, i);
    let t = 0, spend = 0, alive = true;
    let outcome = null, failStage = null, failMode = null;
    const legs = [];

    // Counterfactual: would this molecule have cleared every scientific gate if
    // money were never the constraint? Its science is fixed by its own draws, so
    // a company that dies of financing may still have been holding a real drug.
    let sciWinner = true;
    for (let si = 0; si < STAGES.length; si++) {
      if (d[si * DPS + 3] > p[STAGES[si].key]) { sciWinner = false; break; }
    }

    for (let si = 0; si < STAGES.length; si++) {
      const key = STAGES[si].key;
      const b = si * DPS;
      const cn = china && key === "p1";

      if (["p1", "p2", "p3"].includes(key)) {
        const mult = { p1: 0.95, p2: 1.0, p3: 1.02 }[key];
        let pr;
        if (params.finMode === "sourced") {
          // Data-anchored: a flat per-round raise-success curve calibrated to the
          // observed biotech follow-on rate (~50% gross) and the 2022–23 SVB
          // "Series A cliff" (356 Series A -> 102 Series B), stripped of the modelled
          // drag penalty and round-size sensitivity. ~4% fail in a good market,
          // ~23% in a bad one.
          pr = clamp(0.683 + 0.292 * climate, 0.05, 0.99);
        } else {
          pr = clamp((0.62 + 0.36 * climate) * mult, 0.05, 0.985);
          if (t * 12 > benchTotal * 0.55) pr *= 0.85;
          // A faster, cheaper program needs a smaller round and less runway, so it
          // closes more readily. `need` is time-and-cost vs benchmark; neutral at 1.0.
          const need = 0.5 * (moRoute[key] / T.mo[key] + costRoute[key] / T.cost[key]);
          pr = 1 - (1 - pr) * clamp(0.15 + 0.85 * need, 0.35, 1.25);
        }
        if (d[b] > pr) {
          alive = false; outcome = "dead"; failStage = key; failMode = "finance";
          legs.push({ stage: key, t0: t, t1: t + 0.35, spend: 0, blocked: true });
          t += 0.35;
          break;
        }
      }

      const months = moRoute[key] * (0.78 + d[b + 1] * 0.46);
      const direct = costRoute[key] * (0.65 + d[b + 2] * 0.8);
      const ope = opex[key] * (cn ? CN.opex : 1) * months;

      const yrs = months / 12, stSpend = direct + ope;
      legs.push({ stage: key, t0: t, t1: t + yrs, spend: stSpend });
      t += yrs; spend += stSpend;

      if (d[b + 3] > p[key]) {
        alive = false; outcome = "dead"; failStage = key;
        failMode = pickMode(d[b + 4], key);
        break;
      }
    }

    if (alive) { outcome = "approved"; approvals += 1; }
    else { const k = `${failStage}|${failMode}`; ledger[k] = (ledger[k] || 0) + 1; }

    const lost = outcome === "dead" && failMode === "finance" && sciWinner;
    if (lost) lostWinners += 1;

    totalCapital += spend;
    let acc = 0;
    const cum = legs.map((l) => { acc += l.spend; return acc; });
    companies.push({ i, outcome, failStage, failMode, endT: t, spend, legs, cum, lost });
  }

  return { companies, ledger, approvals, totalCapital, lostWinners,
    maxT: Math.max(...companies.map((c) => c.endT)), eff: { p, moRoute, costRoute } };
}

const REPS = 60;
function simulate(params) {
  const first = runCohort(params, 0);
  let cap = first.totalCapital, ap = first.approvals, lw = first.lostWinners;
  const per = [first.approvals ? first.totalCapital / first.approvals : null];
  for (let r = 1; r < REPS; r++) {
    const c = runCohort(params, r);
    cap += c.totalCapital; ap += c.approvals; lw += c.lostWinners;
    per.push(c.approvals ? c.totalCapital / c.approvals : null);
  }
  const valid = per.filter((v) => v != null).sort((a, b) => a - b);
  const q = (f) => valid.length ? valid[Math.min(valid.length - 1, Math.floor(valid.length * f))] : null;
  return { ...first, poolApprovals: ap / REPS, poolCapital: cap / REPS, poolLostWinners: lw / REPS,
    costPerApproval: ap ? cap / ap : null, p10: q(0.1), p90: q(0.9) };
}

/* ============================================================
   SANKEY — the horizontal axis is years. Column width is that
   stage's duration. The spine shows where the cohort actually is,
   so it starts as an unresolved block at the left and builds
   rightward; everything that ends leaves upward into its lane,
   and what survives arrives at Approved along the bottom.
   ============================================================ */
const SW = 1260, FX0 = 128, HEAD = 88, HF = 196, GAPTOL = 46, LABW = 226, LGAP = 6;

function Sankey({ title, sourceLabel, val, inS, cash, sci, approved, end, vs, cashWinners,
  arrivals, pick, moRoute, maxT, clock, scaleMax, fmt, showAxis, accent, startYear }) {
  const sc = (v) => (scaleMax > 0 ? (v / scaleMax) * HF : 0);

  /* horizontal geometry: everything is time */
  let x = FX0, cumYr = 0;
  const cols = STAGES.map((s, i) => {
    const yrs = moRoute[s.key] / 12;
    const w = Math.max(yrs * PXY, 13);
    const c = { s, i, x0: x, x1: x + w, w, yrs };
    x += w; cumYr += yrs;
    return c;
  });
  const spineEnd = x;
  const TX = spineEnd + GAPTOL;
  const LANEW = Math.max(maxT * PXY, 60);
  const LABX = TX + LANEW + 16;

  /* lanes: cash on top, then the phases in order, Approved at the bottom.
     Every tributary leaves the spine upward, so none of them cross. */
  const order = ["cash", ...STAGES.map((s) => s.key), "approved"];
  const endOf = (k) => k === "cash" ? end.cash : k === "approved" ? end.approved : (end.sci[k] || 0);
  const labelOf = (k) => k === "cash" ? "Ran out of cash"
    : k === "approved" ? "Approved" : `Failed at ${STAGES.find((s) => s.key === k).name}`;
  const colourOf = (k) => k === "cash" ? CASH : k === "approved" ? ALIVE : FAILC[k];

  const lane = {};
  let cur = HEAD;
  order.forEach((k) => { const h = sc(endOf(k)); lane[k] = { k, y0: cur, h, c: colourOf(k), label: labelOf(k), v: endOf(k) }; cur += h + LGAP; });
  const Y_BOT = lane.approved.y0 + lane.approved.h;

  // two-line labels need vertical room a thin lane doesn't have, so walk down
  // the stack and push each label clear of the one above it
  const visible = order.map((k) => lane[k]).filter((L) => L && L.h >= 0.5);
  let lastLabel = HEAD - 32;
  visible.forEach((L) => {
    L.labelY = Math.max(L.y0 + Math.min(L.h / 2, 9), lastLabel + 30);
    lastLabel = L.labelY;
  });

  const AXIS = Math.max(cur + 12, lastLabel + 22);
  const SH = AXIS + (showAxis ? 32 : 14);

  const ribbon = (x0, a0, a1, x1, b0, b1) => {
    const xm = (x0 + x1) / 2;
    return `M${x0},${a0} C${xm},${a0} ${xm},${b0} ${x1},${b0} L${x1},${b1} C${xm},${b1} ${xm},${a1} ${x0},${a1} Z`;
  };
  const filled = {};
  const take = (k, v) => { const s = lane[k]; const y = s.y0 + (filled[k] || 0); filled[k] = (filled[k] || 0) + sc(v); return [y, y + sc(v)]; };

  const laneArea = (k) => {
    const L = lane[k];
    if (!L || L.v <= 0 || L.h < 2.5) return null;
    const pts = arrivals[k] || [];
    const xOf = (tt) => TX + clamp(tt / maxT, 0, 1) * LANEW;
    const yOf = (v) => L.y0 + L.h - (v / L.v) * L.h;
    let d = `M${TX},${L.y0 + L.h}`, lastY = L.y0 + L.h;
    for (const p of pts) {
      if (p.t > clock) break;
      const px = xOf(p.t), py = yOf(pick(p));
      d += ` L${px},${lastY} L${px},${py}`;
      lastY = py;
    }
    d += ` L${xOf(clock)},${lastY} L${xOf(clock)},${L.y0 + L.h} Z`;
    return d;
  };

  /* the spine: each column is as tall as the value that has reached it */
  const nodes = cols.map((c) => {
    const v = val[c.s.key] || 0;
    const top = Y_BOT - sc(v);
    const yInS = top + sc(inS[c.s.key] || 0);
    const yCash = yInS + sc(cash[c.s.key] || 0);
    const ySci = yCash + sc(sci[c.s.key] || 0);
    return { ...c, v, top, yInS, yCash, ySci };
  });

  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width: "100%", height: "auto", display: "block" }}
      role="img" aria-label={`${title}: 100 companies running left to right across ${cumYr.toFixed(1)} years into their endings.`}>
      <rect x="0" y="4" width="4" height="13" fill={accent || INK} />
      <text x="10" y="15" fontSize="11.5" fill={INK} fontFamily="var(--mono)" letterSpacing="1.6" fontWeight="600">
        {title.toUpperCase()}
      </text>

      {cols.map((c) => {
        const row = c.i % 2 === 0 ? 0 : 1;
        const ly = HEAD - 44 + row * 15;
        return (
          <g key={c.s.key}>
            <text x={c.x0 + c.w / 2} y={ly} textAnchor="middle" fontSize="9" fill={c.s.c}
              fontFamily="var(--mono)" fontWeight="700" letterSpacing="0.5">{c.s.tag}</text>
            <text x={c.x0 + c.w / 2} y={ly + 10} textAnchor="middle" fontSize="8.5" fill={MUTED}
              fontFamily="var(--mono)">{c.yrs.toFixed(1)}y</text>
            <line x1={c.x0 + c.w / 2} y1={ly + 14} x2={c.x0 + c.w / 2} y2={HEAD - 8}
              stroke={RULE} strokeWidth="1" />
            <line x1={c.x1} y1={HEAD - 8} x2={c.x1} y2={HEAD - 4} stroke={RULE} strokeWidth="1" />
          </g>
        );
      })}
      <line x1={FX0} y1={HEAD - 8} x2={spineEnd} y2={HEAD - 8} stroke={RULE} strokeWidth="1" />

      <rect x={FX0 - 15} y={Y_BOT - Math.max(sc(val.preclinical || 0), 1)} width="9"
        height={Math.max(sc(val.preclinical || 0), 1)} fill={INK} />
      <text x={FX0 - 23} y={Y_BOT - 4} textAnchor="end" fontSize="13" fill={INK}
        fontFamily="var(--mono)" fontWeight="600">{fmt(val.preclinical || 0)}</text>
      <text x={FX0 - 23} y={Y_BOT + 9} textAnchor="end" fontSize="10" fill={MUTED} fontFamily="var(--sans)">
        {sourceLabel}
      </text>

      {/* spine columns: solid is resolved-and-moving-on, pale is still in that stage */}
      {nodes.map((n) => n.v > 0.0001 && (
        <g key={n.s.key}>
          <rect x={n.x0} y={n.ySci} width={n.w} height={Math.max(Y_BOT - n.ySci, 0)} fill={n.s.c} opacity="0.9" />
          {n.yInS - n.top > 0.3 && (
            <rect x={n.x0} y={n.top} width={n.w} height={n.yInS - n.top} fill={n.s.c} opacity="0.34" />
          )}
        </g>
      ))}

      {/* tributaries, all leaving upward */}
      {nodes.map((n) => (
        <g key={n.s.key}>
          {(cash[n.s.key] || 0) > 0 && (() => { const [b0, b1] = take("cash", cash[n.s.key]);
            return <path d={ribbon(n.x1, n.yInS, n.yCash, TX, b0, b1)} fill={CAPITAL} opacity="0.36" />; })()}
          {(sci[n.s.key] || 0) > 0 && (() => { const [b0, b1] = take(n.s.key, sci[n.s.key]);
            return <path d={ribbon(n.x1, n.yCash, n.ySci, TX, b0, b1)} fill={n.s.f} opacity="0.5" />; })()}
        </g>
      ))}

      {approved > 0 && (() => { const [b0, b1] = take("approved", approved);
        return <path d={ribbon(spineEnd, Y_BOT - sc(approved), Y_BOT, TX, b0, b1)} fill={ALIVE} opacity="0.48" />; })()}

      {order.map((k) => {
        const L = lane[k];
        if (!L || L.h < 0.5) return null;
        const now = k === "cash" ? STAGES.reduce((a, z) => a + (cash[z.key] || 0), 0)
          : k === "approved" ? approved : (sci[k] || 0);
        const d = laneArea(k);
        return (
          <g key={k}>
            <rect x={TX} y={L.y0} width={LANEW} height={Math.max(L.h, 2.5)} fill={L.c} opacity="0.13" />
            {d && <path d={d} fill={L.c} opacity="0.92" />}
            {Math.abs(L.labelY - (L.y0 + L.h / 2)) > 5 && (
              <path d={`M${TX + LANEW},${L.y0 + L.h / 2} L${LABX - 7},${L.labelY - 3}`}
                stroke={RULE} strokeWidth="1" fill="none" />
            )}
            <rect x={LABX - 12} y={L.labelY - 9} width="6" height="12" fill={L.c} />
            <text x={LABX} y={L.labelY} fontSize="11.5" fill={INK}
              fontFamily="var(--sans)" fontWeight="600">{L.label}
              {k === "cash" && cashWinners > 0.5 && (
                <tspan fill={ALIVE} fontFamily="var(--mono)" fontSize="9.5" fontWeight="600">
                  {"  "}{Math.round(cashWinners)} would've made it</tspan>
              )}</text>
            <text x={LABX} y={L.labelY + 14} fontSize="11" fill={MUTED}
              fontFamily="var(--mono)">{fmt(now)}<tspan fill={RULE}> / {fmt(L.v)}</tspan>
              {vs && (() => {
                const other = k === "cash" ? vs.cash : k === "approved" ? vs.approved : (vs.sci[k] || 0);
                const dd = L.v - other;
                if (Math.abs(dd) < 0.5) return null;
                return <tspan fill={dd < 0 ? ALIVE : LOST} fontWeight="600">
                  {"  "}{dd > 0 ? "+" : "−"}{fmt(Math.abs(dd))}</tspan>;
              })()}
            </text>
          </g>
        );
      })}

      <line x1={TX + clamp(clock / maxT, 0, 1) * LANEW} y1={HEAD - 4}
        x2={TX + clamp(clock / maxT, 0, 1) * LANEW} y2={AXIS} stroke={INK} strokeWidth="1" opacity="0.4" />
      <text x={TX + LANEW} y={HEAD - 14} textAnchor="end" fontSize="9.5"
        fill={clock >= maxT ? ALIVE : MUTED} fontFamily="var(--mono)" fontWeight={clock >= maxT ? 700 : 500}>
        {clock >= maxT ? `RESOLVED ${startYear + Math.round(maxT)} · ${maxT.toFixed(1)} YRS`
          : `RUNS TO ${startYear + Math.round(maxT)}`}
      </text>

      {showAxis && (
        <g>
          <line x1={FX0} y1={AXIS} x2={spineEnd} y2={AXIS} stroke={RULE} strokeWidth="1" />
          <line x1={TX} y1={AXIS} x2={TX + LANEW} y2={AXIS} stroke={RULE} strokeWidth="1" />
          {[0, 0.5, 1].map((f) => (
            <g key={`a${f}`}>
              <line x1={FX0 + f * (spineEnd - FX0)} y1={AXIS} x2={FX0 + f * (spineEnd - FX0)} y2={AXIS + 4} stroke={RULE} />
              <text x={FX0 + f * (spineEnd - FX0)} y={AXIS + 15} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}
                fontSize="9" fill={MUTED} fontFamily="var(--mono)">{startYear + Math.round(f * cumYr)}</text>
            </g>
          ))}
          {[0, 0.5, 1].map((f) => (
            <g key={`b${f}`}>
              <line x1={TX + f * LANEW} y1={AXIS} x2={TX + f * LANEW} y2={AXIS + 4} stroke={RULE} />
              <text x={TX + f * LANEW} y={AXIS + 15} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}
                fontSize="9" fill={MUTED} fontFamily="var(--mono)">{startYear + Math.round(f * maxT)}</text>
            </g>
          ))}
          <text x={FX0} y={AXIS + 27} fontSize="8.5" fill={MUTED} fontFamily="var(--mono)" letterSpacing="1.1">
CALENDAR YEARS FROM A {startYear} START — 1 YEAR = {PXY}PX THROUGHOUT →
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------- controls ---------- */
const A_ACC = "#1E3C5E", B_ACC = "#8B3E30";

function Row({ on, onChange, label, grade, accent, shows }) {
  const cols = { A: "#17594F", B: "#5C7A2E", C: "#B5762A", F: "#A03A2C" };
  return (
    <div style={{ borderLeft: `3px solid ${on ? accent : "transparent"}`,
      background: on ? "rgba(22,25,26,0.045)" : "none", padding: "7px 9px", marginBottom: 2, borderRadius: 2 }}>
      <button onClick={() => onChange(!on)} aria-pressed={on}
        style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none",
          padding: 0, cursor: "pointer", textAlign: "left", width: "100%" }}>
        <span style={{ width: 30, height: 17, borderRadius: 9, background: on ? accent : "#CFD2CC",
          position: "relative", flexShrink: 0, transition: "background 150ms" }}>
          <span style={{ position: "absolute", top: 2.5, left: on ? 15 : 2.5, width: 12, height: 12,
            borderRadius: 6, background: "#fff", transition: "left 150ms" }} />
        </span>
        <span style={{ fontSize: 11.5, fontWeight: on ? 600 : 500, color: on ? INK : "#4A5150", flex: 1, lineHeight: 1.3 }}>
          {label}
        </span>
        <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: "#fff",
          background: cols[grade], padding: "1px 4px", borderRadius: 2 }}>{grade}</span>
      </button>
      <div className="mono" style={{ fontSize: 10, marginTop: 5, lineHeight: 1.6, paddingLeft: 39 }}>
        {shows.map((seg, i) => (
          <span key={i} style={{ marginRight: 10, whiteSpace: "nowrap" }}>
            <span style={{ color: MUTED }}>{seg.tag} </span>
            <span style={{ color: MUTED }}>{seg.from} → </span>
            <span style={{ color: accent, fontWeight: 700 }}>{seg.to}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Btn({ active, onClick, children, tone = ALIVE }) {
  return <button onClick={onClick} className="mono" style={{
    padding: "5px 10px", fontSize: 11.5, cursor: "pointer", borderRadius: 2,
    border: `1px solid ${active ? tone : RULE}`, background: active ? tone : "transparent",
    color: active ? "#fff" : INK, fontWeight: active ? 600 : 500,
  }}>{children}</button>;
}

const CAT = {
  time: { name: "Saves time & money", c: "#B5762A", blurb: "These shorten bars. None of them changes whether the drug works." },
  odds: { name: "Improves the odds", c: "#17594F", blurb: "These change where the spine narrows, and so how many reach the end." },
};

const SWITCHES = [
  { key: "gen", cat: "time", grade: "B", tone: COLOR.preclinical,
    label: "Generative chemistry & in-silico screening",
    shows: [{ s: "preclinical", q: "mo" }, { s: "preclinical", q: "cost" }, { s: "ind", q: "mo" }],
    note: "Model-designed candidates and computational triage before the bench. Cheaper, faster candidates — who then face exactly the same clinical gauntlet." },
  { key: "sites", cat: "time", grade: "C", tone: COLOR.p1,
    label: "AI site selection & activation",
    shows: [{ s: "p1", q: "mo" }, { s: "p2", q: "mo" }, { s: "p3", q: "mo" }],
    note: "Ranking investigator sites on predicted enrollment instead of prior relationships. Vendor-reported, unaudited." },
  { key: "enrol", cat: "time", grade: "C", tone: COLOR.p2,
    label: "AI patient matching & enrollment",
    shows: [{ s: "p2", q: "mo" }, { s: "p3", q: "mo" }, { s: "p2", q: "cost" }],
    note: "Screening records against protocol criteria to fill cohorts faster. The biggest cycle-time claim in the vendor literature, and the least audited." },
  { key: "submit", cat: "time", grade: "C", tone: COLOR.reg,
    label: "Automated submission drafting",
    shows: [{ s: "reg", q: "mo" }],
    note: "Generating CSRs and module text from trial data. Real savings, on the shortest and cheapest stage in the pipeline — watch how little it moves." },
  { key: "china", cat: "time", grade: "B", tone: COLOR.p1,
    label: "Run Phase I in China",
    shows: [{ s: "p1", q: "mo" }, { s: "p1", q: "cost" }],
    note: "First-in-human in China: direct costs about 60% lower and enrollment two to three times faster, on a large pool of treatment-naive patients. Phase II onward stays in the US, so nothing here turns on the single-country data question." },
  { key: "aiPh1", cat: "odds", grade: "B", tone: COLOR.p1,
    label: "In-silico ADMET & toxicity prediction",
    shows: [{ s: "p1", q: "p" }],
    note: "Predicting absorption, metabolism and tox before dosing humans. Jayatunga et al. 2024 found AI-discovered molecules clear Phase I at 80–90% — real, and the cheapest phase to win." },
  { key: "genetics", cat: "odds", grade: "A",
    label: "Genetically supported target selection",
    shows: [{ s: "p2", q: "p" }, { s: "p3", q: "p" }],
    note: "Choosing targets with human genetic causal evidence, which ML is what makes tractable at genome scale. Nelson et al. 2015 estimated a doubling of clinical success; Minikel/Nelson 2024 refined it to 2.6x; King et al. replicated it and located the effect in Phases II and III. Only about 15% of programmes currently have that support — the best-evidenced lever here by some distance." },
];
const TIME_SW = SWITCHES.filter((s) => s.cat === "time");
const ODDS_SW = SWITCHES.filter((s) => s.cat === "odds");

const BLANK = { gen: false, sites: false, enrol: false, submit: false, china: false, aiPh1: false, genetics: false };
const PRESETS = [
  { name: "Nothing vs genetics", a: {}, b: { genetics: true } },
  { name: "Time vs odds", a: { gen: true, sites: true, enrol: true, submit: true, china: true },
    b: { aiPh1: true, genetics: true } },
  { name: "Nothing vs ADMET", a: {}, b: { aiPh1: true } },
  { name: "Nothing vs everything", a: {},
    b: { gen: true, sites: true, enrol: true, submit: true, china: true, aiPh1: true, genetics: true } },
];

/* ============================================================ */
export default function App() {
  const [ta, setTa] = useState("all");
  const [market, setMarket] = useState("normal");
  const [unit, setUnit] = useState("companies");
  const [A, setA] = useState({ ...BLANK });
  const [B, setB] = useState({ ...BLANK, genetics: true });
  const [seed, setSeed] = useState(20260722);
  const [finMode, setFinMode] = useState("modelled");
  const [clock, setClock] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const raf = useRef(null), t0 = useRef(0), restart = useRef(null);

  const climate = MARKET[market].climate;
  const rA = useMemo(() => simulate({ ta, climate, seed, finMode, ...A }),
    [ta, climate, seed, finMode, A.gen, A.sites, A.enrol, A.submit, A.china, A.aiPh1, A.genetics]);
  const rB = useMemo(() => simulate({ ta, climate, seed, finMode, ...B }),
    [ta, climate, seed, finMode, B.gen, B.sites, B.enrol, B.submit, B.china, B.aiPh1, B.genetics]);

  const maxRun = Math.max(rA.maxT, rB.maxT);
  const capScale = Math.max(rA.totalCapital, rB.totalCapital, 1);

  const start = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    setHasRun(true); setClock(0);
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setClock(maxRun); return; }
    t0.current = performance.now();
    const step = (now) => {
      const yrs = ((now - t0.current) / 1000) / SEC_PER_YEAR;
      if (yrs >= maxRun) { setClock(maxRun); return; }
      setClock(yrs);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [maxRun]);

  useEffect(() => () => { raf.current && cancelAnimationFrame(raf.current); }, []);
  useEffect(() => {
    if (!hasRun) return;
    clearTimeout(restart.current);
    restart.current = setTimeout(() => start(), 260);
    return () => clearTimeout(restart.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ta, market, seed, unit, finMode, A.gen, A.sites, A.enrol, A.submit, A.china, A.aiPh1, A.genetics,
    B.gen, B.sites, B.enrol, B.submit, B.china, B.aiPh1, B.genetics]);

  const cap = unit === "capital";

  /* what each switch does on its own, so every row is self-documenting
     whether or not it happens to be on in this scenario */
  const solo = useMemo(() => {
    const base = effective({ ta, climate, ...BLANK });
    const tagOf = (k) => STAGES.find((z) => z.key === k).tag;
    const out = {};
    SWITCHES.forEach((sw) => {
      const e = effective({ ta, climate, ...BLANK, [sw.key]: true });
      out[sw.key] = sw.shows.map(({ s: st, q }) => {
        if (q === "mo") return { tag: tagOf(st),
          from: `${(base.moRoute[st] / 12).toFixed(1)}`, to: `${(e.moRoute[st] / 12).toFixed(1)}y` };
        if (q === "cost") return { tag: `${tagOf(st)} cost`,
          from: `$${base.costRoute[st].toFixed(1)}M`, to: `$${e.costRoute[st].toFixed(1)}M` };
        return { tag: `${tagOf(st)} pass`,
          from: `${Math.round(base.p[st] * 100)}%`, to: `${Math.round(e.p[st] * 100)}%` };
      });
    });
    return out;
  }, [ta, climate]);

  /* Sensitivity: each lever flipped on alone, from an all-off baseline, at the
     current area / market / gate. Cost per approved drug comes from the cohort
     simulation; PTS (technical likelihood of approval) is the product of the
     scientific pass rates, which financing never touches. */
  const sensitivity = useMemo(() => {
    const baseSim = simulate({ ta, climate, seed, finMode, ...BLANK });
    const ptsOf = (extra) => STAGES.reduce((a, s) => a * effective({ ta, climate, ...BLANK, ...extra }).p[s.key], 1);
    const basePTS = ptsOf({});
    const rows = SWITCHES.map((sw) => {
      const sim = simulate({ ta, climate, seed, finMode, ...BLANK, [sw.key]: true });
      const cost = baseSim.costPerApproval ? (sim.costPerApproval - baseSim.costPerApproval) / baseSim.costPerApproval * 100 : 0;
      const pts = basePTS ? (ptsOf({ [sw.key]: true }) - basePTS) / basePTS * 100 : 0;
      return { key: sw.key, label: sw.label, grade: sw.grade, cat: sw.cat, cost, pts };
    }).sort((a, b) => Math.abs(b.cost) - Math.abs(a.cost));
    return {
      rows,
      maxCost: Math.max(...rows.map((r) => Math.abs(r.cost)), 1),
      maxPts: Math.max(...rows.map((r) => Math.abs(r.pts)), 1),
      baseCPA: baseSim.costPerApproval, basePTS,
    };
  }, [ta, climate, seed, finMode]);

  const makeFlow = (res) => {
    const t = hasRun ? clock : 0;
    const val = {}, inS = {}, cash = {}, sci = {};
    STAGES.forEach((s) => { val[s.key] = 0; inS[s.key] = 0; cash[s.key] = 0; sci[s.key] = 0; });
    let app = 0, totC = 0, cashWinners = 0;
    res.companies.forEach((c) => {
      let sp = 0;
      for (const l of c.legs) {
        if (l.blocked) continue;
        sp += t >= l.t1 ? l.spend : t > l.t0 ? l.spend * ((t - l.t0) / (l.t1 - l.t0)) : 0;
      }
      totC += sp;
      const w = cap ? sp : 1;
      c.legs.forEach((l) => { if (t >= l.t0) val[l.stage] += w; });
      const here = c.legs.find((l) => t >= l.t0 && t < l.t1);
      if (here) inS[here.stage] += w;
      if (t >= c.endT) {
        if (c.outcome === "approved") app += w;
        else if (c.failMode === "finance") { cash[c.failStage] += w; if (c.lost) cashWinners += 1; }
        else sci[c.failStage] += w;
      }
    });
    return { val, inS, cash, sci, app, totC, cashWinners };
  };

  const makeEnd = (res) => {
    const sci = {}, fin = {};
    STAGES.forEach((s) => { sci[s.key] = 0; fin[s.key] = 0; });
    let app = 0;
    res.companies.forEach((c) => {
      const w = cap ? c.spend : 1;
      if (c.outcome === "approved") app += w;
      else if (c.failMode === "finance") fin[c.failStage] += w;
      else sci[c.failStage] += w;
    });
    return { sci, approved: app, cash: STAGES.reduce((a, s) => a + fin[s.key], 0) };
  };

  const makeArrivals = (res) => {
    const m = { cash: [], approved: [] };
    STAGES.forEach((s) => { m[s.key] = []; });
    res.companies.forEach((c) => {
      const k = c.outcome === "approved" ? "approved" : c.failMode === "finance" ? "cash" : c.failStage;
      m[k].push({ t: c.endT, spend: c.spend });
    });
    const out = {};
    Object.entries(m).forEach(([k, arr]) => {
      arr.sort((x, y) => x.t - y.t);
      let n = 0, cc = 0;
      out[k] = arr.map((e) => { n += 1; cc += e.spend; return { t: e.t, n, c: cc }; });
    });
    return out;
  };

  /* capital, split by what it is currently doing AND which phase it sits in */
  const capSplit = (res) => {
    const t = hasRun ? clock : 0;
    const work = {}, lost = {};
    STAGES.forEach((s) => { work[s.key] = 0; lost[s.key] = 0; });
    let approved = 0, cash = 0;
    res.companies.forEach((c) => {
      let sp = 0;
      for (const l of c.legs) {
        if (l.blocked) continue;
        sp += t >= l.t1 ? l.spend : t > l.t0 ? l.spend * ((t - l.t0) / (l.t1 - l.t0)) : 0;
      }
      if (t < c.endT) {
        const here = c.legs.find((l) => t >= l.t0 && t < l.t1);
        work[here ? here.stage : c.legs[c.legs.length - 1].stage] += sp;
      } else if (c.outcome === "approved") approved += sp;
      else if (c.failMode === "finance") cash += sp;
      else lost[c.failStage] += sp;
    });
    const live = STAGES.reduce((a, s) => a + work[s.key], 0) + approved;
    const gone = STAGES.reduce((a, s) => a + lost[s.key], 0) + cash;
    return { work, lost, approved, cash, live, gone, total: live + gone };
  };
  const kA = useMemo(() => capSplit(rA), [rA, clock, hasRun]);
  const kB = useMemo(() => capSplit(rB), [rB, clock, hasRun]);

  const fA = useMemo(() => makeFlow(rA), [rA, clock, hasRun, cap]);
  const fB = useMemo(() => makeFlow(rB), [rB, clock, hasRun, cap]);
  const eA = useMemo(() => makeEnd(rA), [rA, cap]);
  const eB = useMemo(() => makeEnd(rB), [rB, cap]);
  const aA = useMemo(() => makeArrivals(rA), [rA]);
  const aB = useMemo(() => makeArrivals(rB), [rB]);

  const money = (m) => m == null ? "—" : m >= 1000 ? `$${(m / 1000).toFixed(2)}B` : `$${m.toFixed(0)}M`;
  const yrsOf = (r) => STAGES.reduce((a, s) => a + r.eff.moRoute[s.key], 0) / 12;
  const fmt = cap
    ? (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v)}M`
    : (v) => `${Math.round(v)}`;

  const rows = [
    { k: "Cost per approved drug", a: rA.costPerApproval, b: rB.costPerApproval, f: money, better: "low" },
    { k: "Approvals per cohort", a: rA.poolApprovals, b: rB.poolApprovals, f: (v) => v.toFixed(1), better: "high" },
    { k: "Capital consumed", a: rA.poolCapital, b: rB.poolCapital, f: money, better: "low" },
    { k: "Viable drugs lost to cash", a: rA.poolLostWinners, b: rB.poolLostWinners,
      f: (v) => v.toFixed(1), better: "low",
      hint: "would have been approved with money" },
    { k: "Pipeline length", a: yrsOf(rA), b: yrsOf(rB), f: (v) => `${v.toFixed(1)} yrs`, better: "low" },
  ];

  const bank = (S, setS, acc, tag) => (
    <div className="cell">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 4, height: 15, background: acc, display: "inline-block" }} />
        <span className="eyebrow" style={{ color: INK }}>Scenario {tag}</span>
        <button onClick={() => setS({ ...BLANK })} className="mono" style={{ marginLeft: "auto",
          background: "none", border: "none", cursor: "pointer", fontSize: 10, color: MUTED,
          letterSpacing: "0.08em" }}>CLEAR</button>
      </div>
      {["time", "odds"].map((c) => (
        <div key={c} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 5,
            paddingBottom: 4, borderBottom: `2px solid ${CAT[c].c}` }}>
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: "0.14em",
              fontWeight: 700, color: CAT[c].c, textTransform: "uppercase" }}>{CAT[c].name}</span>
            <span className="mono" style={{ fontSize: 9, color: MUTED, marginLeft: "auto" }}>
              {SWITCHES.filter((w) => w.cat === c && S[w.key]).length}/{SWITCHES.filter((w) => w.cat === c).length} ON
            </span>
          </div>
          {SWITCHES.filter((w) => w.cat === c).map((sw) => (
            <Row key={sw.key} on={!!S[sw.key]} onChange={(v) => setS((o) => ({ ...o, [sw.key]: v }))}
              label={sw.label} grade={sw.grade} accent={CAT[c].c} shows={solo[sw.key]} />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ background: GROUND, color: INK, minHeight: "100vh", padding: "26px 20px 60px", fontFamily: "var(--sans)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        :root{--sans:'Space Grotesk',ui-sans-serif,'Helvetica Neue',Arial,sans-serif;
              --mono:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,monospace}
        .mono{font-family:var(--mono)}
        .wrap{max-width:1240px;margin:0 auto}
        .panel{background:${PANEL};border:1px solid ${RULE};padding:18px 20px}
        .eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.18em;color:${MUTED};text-transform:uppercase}
        table{border-collapse:collapse;width:100%}
        th,td{text-align:left;padding:7px 10px;font-size:12px;border-bottom:1px solid ${RULE}}
        th{font-family:var(--mono);font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:${MUTED};font-weight:500}
        td.num{font-family:var(--mono);text-align:right;white-space:nowrap}
        button:focus-visible{outline:2px solid ${ALIVE};outline-offset:2px}
        .dash{display:grid;grid-template-columns:0.9fr 1fr 1fr;gap:1px;background:${RULE};
              border:1px solid ${RULE};margin-top:16px}
        .cell{background:${PANEL};padding:15px 16px}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
        @media(max-width:980px){.dash{grid-template-columns:1fr}.two{grid-template-columns:1fr}}
      `}</style>

      <div className="wrap">
        <header style={{ marginBottom: 16 }}>
          <div className="eyebrow">{N} companies per cohort · same cohort, same luck, two sets of assumptions</div>
          <h1 style={{ fontSize: "clamp(26px,3.8vw,44px)", lineHeight: 1.04, margin: "10px 0 12px",
            fontWeight: 700, letterSpacing: "-0.028em", maxWidth: 900 }}>
            Two futures for the same hundred companies.
          </h1>
          <p style={{ maxWidth: 700, fontSize: 15, lineHeight: 1.55, color: "#2A2F30", margin: 0 }}>
            Both diagrams run the identical cohort with identical random draws — the same molecule gets
            the same luck in each — so any difference between them is caused by the switches, not by
            chance. Left to right is years.
          </p>
          {!hasRun && (
            <button onClick={start} className="mono" style={{ marginTop: 18, padding: "12px 26px",
              fontSize: 13, letterSpacing: "0.1em", background: INK, color: PANEL,
              border: "none", cursor: "pointer", fontWeight: 600 }}>RUN BOTH →</button>
          )}
        </header>

        <div className="panel" style={{ marginBottom: 16, padding: "12px 20px" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: "34%" }}>Compare</th>
                <th className="num"><span style={{ color: A_ACC }}>■</span> Scenario A</th>
                <th className="num"><span style={{ color: B_ACC }}>■</span> Scenario B</th>
                <th className="num">B vs A</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = r.b - r.a;
                const good = r.better === "low" ? d < 0 : d > 0;
                const pct = r.a ? (d / r.a) * 100 : 0;
                return (
                  <tr key={r.k}>
                    <td style={{ fontWeight: 600 }}>{r.k}
                      {r.hint && <div style={{ fontSize: 9.5, fontWeight: 400, color: MUTED }}>{r.hint}</div>}</td>
                    <td className="num">{r.a == null ? "—" : r.f(r.a)}</td>
                    <td className="num">{r.b == null ? "—" : r.f(r.b)}</td>
                    <td className="num" style={{ color: Math.abs(pct) < 1 ? MUTED : good ? ALIVE : LOST, fontWeight: 600 }}>
                      {r.a == null || r.b == null ? "—" : `${d > 0 ? "+" : ""}${pct.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(() => {
            const vA = rA.poolApprovals + rA.poolLostWinners, vB = rB.poolApprovals + rB.poolLostWinners;
            const pA = vA ? rA.poolLostWinners / vA : 0, pB = vB ? rB.poolLostWinners / vB : 0;
            return (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${RULE}`,
                fontSize: 12, lineHeight: 1.55, color: "#2A2F30" }}>
                Put another way: of every drug that <em>would</em> have been approved with money behind it,{" "}
                <span style={{ color: A_ACC, fontWeight: 700 }}>{(pA * 100).toFixed(0)}%</span> died of financing
                instead of science in Scenario A{" "}
                (<span style={{ color: B_ACC, fontWeight: 700 }}>{(pB * 100).toFixed(0)}%</span> in B), at the{" "}
                {MARKET[market].label.toLowerCase()} market. That share falls toward 20% in a good
                market and climbs past 60% in a bad one — when capital is scarce, a viable drug's
                biggest enemy is the market, not the biology.
              </div>
            );
          })()}
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
            <span className="eyebrow">Capital deployed, and what it is doing</span>
            <span className="mono" style={{ fontSize: 11, color: MUTED }}>
              BOTH BARS ON ONE SCALE · MAX {money(capScale)}
            </span>
          </div>
          {[["A", kA, A_ACC], ["B", kB, B_ACC]].map(([tag, k, acc]) => (
            <div key={tag} style={{ marginBottom: tag === "A" ? 16 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 4, height: 12, background: acc, display: "inline-block" }} />
                <span className="mono" style={{ fontSize: 10.5, letterSpacing: "0.12em", color: INK, fontWeight: 600 }}>
                  SCENARIO {tag}
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: MUTED, marginLeft: "auto" }}>
                  {money(k.total)} deployed
                </span>
              </div>
              {[["Still at work",
                  [...STAGES.map((st) => [k.work[st.key], st.c, `${st.tag} — in progress`]),
                   [k.approved, ALIVE, "behind an approval"]], k.live],
                ["Written off",
                  [...STAGES.map((st) => [k.lost[st.key], st.f, `${st.tag} — failed`]),
                   [k.cash, CASH, "ran out of money"]], k.gone]].map(([lbl, segs, tot]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: MUTED, width: 88, flexShrink: 0 }}>{lbl}</span>
                  <span style={{ flex: 1, height: 18, background: "#DEDFDA", display: "flex", overflow: "hidden" }}>
                    {segs.map(([v, c, title]) => (
                      <span key={title} title={`${title}: ${money(v)}`}
                        style={{ width: `${(v / capScale) * 100}%`, background: c, display: "block" }} />
                    ))}
                  </span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 600, width: 64,
                    textAlign: "right", flexShrink: 0 }}>{money(tot)}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 10, borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 9.5, color: MUTED, alignItems: "center" }}>
              <span className="mono" style={{ letterSpacing: "0.1em", width: 88, flexShrink: 0 }}>IN PROGRESS</span>
              {STAGES.map((st) => (
                <span key={st.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 9, height: 9, background: st.c, display: "inline-block" }} />{st.tag}
                </span>
              ))}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 9, height: 9, background: ALIVE, display: "inline-block" }} />APPROVED
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 9.5, color: MUTED,
              alignItems: "center", marginTop: 5 }}>
              <span className="mono" style={{ letterSpacing: "0.1em", width: 88, flexShrink: 0 }}>WRITTEN OFF</span>
              {STAGES.map((st) => (
                <span key={st.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 9, height: 9, background: st.f, display: "inline-block" }} />{st.tag}
                </span>
              ))}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 9, height: 9, background: CASH, display: "inline-block" }} />OUT OF MONEY
              </span>
            </div>
            <p style={{ fontSize: 10, color: MUTED, margin: "7px 0 0", lineHeight: 1.5 }}>
              Both bars are cut by phase, on the same colours as the diagrams below: the live ramp for
              money still in play, the rust ramp for money lost at that phase. Segments run pre-clinical
              to review, left to right, so the written-off bar reddens toward the right as the losses
              move later and get more expensive.
            </p>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="eyebrow" style={{ marginRight: 4 }}>Measure in</span>
              <Btn active={unit === "companies"} onClick={() => setUnit("companies")}>COMPANIES</Btn>
              <Btn active={unit === "capital"} onClick={() => setUnit("capital")} tone={CAPITAL}>CAPITAL</Btn>
            </span>
            <span className="mono" style={{ fontSize: 12, color: MUTED }}>
              {hasRun && clock >= maxRun
                ? <span><span style={{ color: ALIVE, fontWeight: 600 }}>COMPLETE</span>{` · ${maxRun.toFixed(1)} YRS`}</span>
                : `YEAR ${hasRun ? Math.max(clock, 0).toFixed(1) : "0.0"} / ${maxRun.toFixed(1)}`}
              {` · ${TAS[ta].name} · ${MARKET[market].label.toLowerCase()} market`}
            </span>
          </div>

          <Sankey title="Scenario A" sourceLabel={cap ? "deployed so far" : "entered the pipe"} accent={A_ACC}
            val={fA.val} inS={fA.inS} cash={fA.cash} sci={fA.sci} approved={fA.app}
            end={eA} vs={eB} cashWinners={cap ? 0 : fA.cashWinners} arrivals={aA} pick={cap ? ((p) => p.c) : ((p) => p.n)}
            moRoute={rA.eff.moRoute} maxT={rA.maxT} clock={hasRun ? clock : 0} startYear={START_YEAR}
            scaleMax={cap ? capScale : N} fmt={fmt} showAxis />
          <div style={{ height: 10, borderTop: `1px dashed ${RULE}`, marginTop: 6 }} />
          <Sankey title="Scenario B" sourceLabel={cap ? "deployed so far" : "entered the pipe"} accent={B_ACC}
            val={fB.val} inS={fB.inS} cash={fB.cash} sci={fB.sci} approved={fB.app}
            end={eB} vs={eA} cashWinners={cap ? 0 : fB.cashWinners} arrivals={aB} pick={cap ? ((p) => p.c) : ((p) => p.n)}
            moRoute={rB.eff.moRoute} maxT={rB.maxT} clock={hasRun ? clock : 0} startYear={START_YEAR}
            scaleMax={cap ? capScale : N} fmt={fmt} showAxis />

          <p style={{ fontSize: 11.5, color: MUTED, margin: "10px 0 0", lineHeight: 1.55, maxWidth: 960 }}>
            Both diagrams share the same pixels-per-year and the same vertical scale, so lengths and
            thicknesses are directly comparable — a scenario that finishes sooner is drawn shorter. The green and rust figures beside each lane are that lane's
            difference against the other scenario. <strong style={{ color: INK }}>Blue is still
            in play</strong> — pale inside a stage, solid once past it.
            <strong style={{ color: FAILC.p2 }}> Rust is failed</strong>,
            <strong style={{ color: CASH }}> black is out of money</strong>,
            <strong style={{ color: ALIVE }}> green is approved</strong>.
          </p>
        </div>

        <div className="dash">
          <div className="cell">
            <div className="eyebrow" style={{ marginBottom: 9 }}>Shared setup</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
              <Btn active={false} onClick={start}>▸ {hasRun ? "REPLAY" : "RUN"}</Btn>
              <Btn active={false} onClick={() => setSeed(Math.floor(Math.random() * 1e8))}>RESAMPLE</Btn>
            </div>

            <div className="eyebrow" style={{ marginBottom: 7 }}>Therapeutic area</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
              {Object.entries(TAS).map(([k, v]) => (
                <Btn key={k} active={ta === k} onClick={() => setTa(k)}>{v.name}</Btn>
              ))}
            </div>

            <div className="eyebrow" style={{ marginBottom: 7 }}>Financing market</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5 }}>
              {Object.keys(MARKET).map((k) => (
                <Btn key={k} active={market === k} tone={CAPITAL} onClick={() => setMarket(k)}>
                  {MARKET[k].label.toUpperCase()}
                </Btn>
              ))}
            </div>
            <p style={{ fontSize: 10, color: MUTED, lineHeight: 1.5, margin: "0 0 12px" }}>
              {MARKET[market].tag}. Sets the odds of closing each round — and so the size of the black
              lane and how many viable drugs die of money rather than science.
            </p>

            <div className="eyebrow" style={{ marginBottom: 7 }}>Financing gate</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5 }}>
              <Btn active={finMode === "modelled"} tone={CAPITAL} onClick={() => setFinMode("modelled")}>MODELLED</Btn>
              <Btn active={finMode === "sourced"} tone={CAPITAL} onClick={() => setFinMode("sourced")}>DATA-ANCHORED</Btn>
            </div>
            <p style={{ fontSize: 10, color: MUTED, lineHeight: 1.5, margin: "0 0 12px" }}>
              {finMode === "modelled"
                ? "The full gate: a market-driven raise curve, a penalty on programmes that drag, and easier raises for programmes that have compressed their time and cost."
                : "Just the raise curve, anchored to the observed ~50% biotech follow-on rate and the 2022–23 SVB Series-A cliff (356 Series A → 102 Series B). Drops the two modelled add-ons — so faster programmes no longer raise more easily, because the data doesn't show that."}
            </p>

            <div className="eyebrow" style={{ marginBottom: 7 }}>Comparisons worth running</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {PRESETS.map((p) => (
                <Btn key={p.name} active={false}
                  onClick={() => { setA({ ...BLANK, ...p.a }); setB({ ...BLANK, ...p.b }); }}>{p.name}</Btn>
              ))}
            </div>
          </div>

          {bank(A, setA, A_ACC, "A")}
          {bank(B, setB, B_ACC, "B")}
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
            <span className="eyebrow">Sensitivity — each lever on its own</span>
            <span className="mono" style={{ fontSize: 10, color: MUTED }}>
              {TAS[ta].name} · {MARKET[market].label.toLowerCase()} market · from an all-off baseline
            </span>
          </div>
          <p style={{ fontSize: 11, color: MUTED, margin: "0 0 14px", lineHeight: 1.5, maxWidth: 900 }}>
            Each switch flipped on by itself, measured two ways: its effect on <strong style={{ color: INK }}>cost
            per approved drug</strong> and on <strong style={{ color: INK }}>PTS</strong> — the probability of
            technical success, i.e. the odds a programme clears every scientific gate. The split is the whole
            point: time-and-money levers move cost and leave PTS untouched, while odds levers move both.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(150px,1.3fr) 1fr 1fr", gap: "2px 16px",
            alignItems: "center" }}>
            <div />
            <div className="mono" style={{ fontSize: 9.5, color: MUTED, letterSpacing: "0.1em", textAlign: "right" }}>
              COST / APPROVED DRUG
            </div>
            <div className="mono" style={{ fontSize: 9.5, color: MUTED, letterSpacing: "0.1em", textAlign: "right" }}>
              PTS (LIKELIHOOD OF APPROVAL)
            </div>
            {sensitivity.rows.map((r) => {
              const cCol = CAT[r.cat].c;
              const cw = Math.abs(r.cost) / sensitivity.maxCost * 100;
              const pw = Math.abs(r.pts) / sensitivity.maxPts * 100;
              return (
                <React.Fragment key={r.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 4 }}>
                    <span style={{ width: 8, height: 8, background: cCol, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: INK, lineHeight: 1.25 }}>{r.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    <span style={{ flex: 1, height: 15, background: "#E4E4DF", display: "flex",
                      justifyContent: "flex-end", overflow: "hidden" }}>
                      <span style={{ width: `${cw}%`, background: cCol, display: "block" }} />
                    </span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, width: 42,
                      textAlign: "right", color: r.cost < -0.5 ? cCol : MUTED }}>
                      {r.cost > 0 ? "+" : ""}{r.cost.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    <span style={{ flex: 1, height: 15, background: "#E4E4DF", display: "flex",
                      justifyContent: "flex-end", overflow: "hidden" }}>
                      <span style={{ width: `${pw}%`, background: r.pts > 0.5 ? CAT.odds.c : "transparent", display: "block" }} />
                    </span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, width: 42,
                      textAlign: "right", color: r.pts > 0.5 ? CAT.odds.c : MUTED }}>
                      {r.pts > 0.5 ? `+${r.pts.toFixed(0)}%` : "—"}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <p style={{ fontSize: 10.5, color: MUTED, margin: "12px 0 0", lineHeight: 1.5, maxWidth: 900 }}>
            Baseline at these settings: <span className="mono" style={{ color: INK }}>{money(sensitivity.baseCPA)}</span> per
            approved drug, <span className="mono" style={{ color: INK }}>{(sensitivity.basePTS * 100).toFixed(1)}%</span> PTS.
            Bars are scaled within each column. The ordering by cost impact holds across markets, but the
            magnitudes move — odds levers pull further ahead of time levers as the market worsens, because a
            higher PTS also rescues more drugs from dying of cash.
          </p>
        </div>

        <div className="two">
          <div className="panel">
            <div className="eyebrow" style={{ marginBottom: 10 }}>What each switch does</div>
            <div style={{ fontSize: 10.5, lineHeight: 1.55, color: MUTED }}>
              {["time", "odds"].map((c) => (
                <div key={c} style={{ marginBottom: 12 }}>
                  <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 700,
                    color: CAT[c].c, textTransform: "uppercase", marginBottom: 2 }}>{CAT[c].name}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 7, fontStyle: "italic" }}>{CAT[c].blurb}</div>
                  {SWITCHES.filter((w) => w.cat === c).map((sw) => (
                    <p key={sw.key} style={{ margin: "0 0 8px" }}>
                      <strong style={{ color: INK }}>{sw.label}</strong> — {sw.note}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="eyebrow" style={{ marginBottom: 4 }}>Why the areas differ</div>
            <p style={{ fontSize: 10, color: MUTED, margin: "0 0 12px", lineHeight: 1.45, fontStyle: "italic" }}>
              The area you pick changes every transition rate, duration and cost in the model. Here is
              what is behind those numbers.
            </p>
            <div style={{ fontSize: 10.5, lineHeight: 1.55, color: MUTED }}>
              {Object.entries(TAS).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 11, paddingLeft: 10,
                  borderLeft: `3px solid ${ta === k ? INK : RULE}` }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                    <strong style={{ color: INK, fontSize: 11.5 }}>{v.name}</strong>
                    <span className="mono" style={{ fontSize: 9.5, color: MUTED }}>
                      LOA {(STAGES.reduce((a, s2) => a * v.p[s2.key], 1) * 100).toFixed(1)}% ·{" "}
                      {(STAGES.reduce((a, s2) => a + v.mo[s2.key], 0) / 12).toFixed(1)} yrs
                    </span>
                    {ta === k && <span className="mono" style={{ fontSize: 8.5, color: "#fff",
                      background: INK, padding: "1px 5px", borderRadius: 2, letterSpacing: "0.08em" }}>SELECTED</span>}
                  </div>
                  {v.history}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="panel">
            <div className="eyebrow" style={{ marginBottom: 10 }}>Benchmarks & sources</div>
            <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.65 }}>
              <strong style={{ color: INK }}>Transitions</strong> Citeline/BIO phase-transition data 2014–2023:
              Phase I 47%, II 28%, III 55%, review 92%; likelihood of approval 6.7%, down from 10.4% in 2014.
              Area splits from BIO's 14-category cut and Hay et al.<br />
              <strong style={{ color: INK }}>Durations</strong> BIO: 2.3 / 3.6 / 3.3 years plus 1.3 to approval;
              10.5 years average, 9.2–12.2 by area. These set the column widths.<br />
              <strong style={{ color: INK }}>Costs</strong> Sertkaya et al.: Phase I $1.4–6.6M, II $7.0–19.6M,
              III $11.5–52.9M. Out-of-pocket and uncapitalised — add a discount rate and the time
              switches bite considerably harder.<br />
              <strong style={{ color: INK }}>Burn</strong> $100–250k/month early stage; a step-up of 50%+ moving
              into Phase II; a six-month delay costs eight to nine months of runway.<br />
              <strong style={{ color: INK }}>China</strong> DIA/GlobalData on cost and enrollment; FDA/ODAC 2022
              on single-country data.<br />
              <strong style={{ color: INK }}>AI</strong> Jayatunga et al., <em>Drug Discovery Today</em>, 2024.
              As of early 2026 no AI-discovered drug has been approved anywhere.<br />
              <strong style={{ color: INK }}>Genetics</strong> Nelson et al., <em>Nature Genetics</em> 2015
              (roughly a doubling); King et al., <em>PLOS Genetics</em> 2019 (replication, effect located in
              Phases II and III); Minikel &amp; Nelson, <em>Nature</em> 2024 (2.6x, rising with confidence in
              the causal gene). Modelled here as 1.45x on each of the Phase II and Phase III transitions,
              compounding to about 2.1x overall.
            </div>
            <div className="eyebrow" style={{ margin: "16px 0 8px" }}>Stated assumptions</div>
            <div style={{ fontSize: 11, lineHeight: 1.55, color: "#2A2F30" }}>
              <p style={{ margin: "0 0 9px" }}>
                <strong style={{ color: INK }}>One asset per company.</strong> The unit here is a
                company whose fate is one molecule's fate — it lives or dies with its lead program.
                That is deliberately not the whole industry: in the US, platform companies outnumber
                single-asset ones by roughly three to one among venture-backed biotechs, because
                larger funds prefer bets where one failure doesn't end the company. But single-asset
                and single-lead-asset companies remain common, especially at the clinical-stage IPOs
                that dominate the funnel — and even nominal platforms are often, in practice, valued
                and funded on one lead program. The single-asset frame is chosen because a molecule's
                journey maps cleanly onto a company's; it overstates binary company death relative to
                a diversified platform, which reallocates rather than dies when a program fails.
              </p>
              <p style={{ margin: "0 0 9px" }}>
                <strong style={{ color: INK }}>The financing gate, with its actual numbers.</strong>{" "}
                A round is required to begin Phase I, II and III. The chance it closes is{" "}
                <span className="mono">0.62 + 0.36 × climate</span>, where the market sets climate to
                0.30 (bad), 0.60 (normal) or 0.85 (good) — so a raise succeeds about 73% of the time
                in a bad market and about 93% in a good one, per attempt, compounded across three
                gates. The three settings bracket the observed range, from the 2022–23 winter to a
                2021-style peak. Phase III is scaled slightly harder than Phase I (×1.02 vs ×0.95) because a
                pivotal round is the largest. Two adjustments then apply: a program already past 55%
                of its benchmark clock loses a further 15% (×0.85), reflecting investor fatigue with
                a program that is dragging; and a program that has compressed its time and cost needs
                a smaller, shorter round, which scales its chance of <em>failing</em> to raise by{" "}
                <span className="mono">0.15 + 0.85 × need</span> (need = this round's time-and-cost
                against benchmark, so exactly neutral at benchmark and easier below it). These
                coefficients are calibrated to land the pooled likelihood of approval and the share
                dying of financing in a plausible range — they are not drawn from a specific dataset,
                and this gate is the weakest structural assumption in the model.
              </p>
              <p style={{ margin: "0 0 9px" }}>
                <strong style={{ color: INK }}>Modelled vs data-anchored.</strong> The financing-gate
                switch replaces all of that with a curve tied to real numbers. Biotech follow-on runs
                about 50% per round in normal markets; in the 2022–23 winter SVB counted 356 Series A
                biotechs producing only 102 Series B (~29%), and EY put 55% of emerging biotechs at
                under two years of cash. The data-anchored curve is calibrated to that spread (~4%
                fail-to-raise in a good market, ~23% in a bad one) and drops the drag and round-size
                add-ons. Honest limits: observed graduation conflates money with science and M&amp;A,
                so the viable-but-unfunded share can't be isolated cleanly; funding rounds don't map
                one-to-one onto clinical phases; the winter figure is one lender's book. The two modes
                land close, which is some reassurance — but data-anchored removes the "faster
                programmes raise more easily" effect, because that isn't visible in the data.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: INK }}>The rest.</strong> Costs are out-of-pocket and include
                company overhead and the capital burned by companies that died of financing rather
                than science. The China route charges no extra time or money for a US bridging study,
                only the Phase I speed and cost gains, so it reads a little favourably. The time
                switches use vendor-reported reductions and stack multiplicatively; nothing audits
                them. Failure-mode splits come from older, coarse literature. The calendar years start
                from the financing climate you pick, but that climate is then held fixed for the whole
                run — a 2021 cohort does not live through 2022's crash here, which would mean treating
                the start year as a vintage rather than a setting.
              </p>
            </div>
          </div>
        </div>

        <p className="mono" style={{ fontSize: 10.5, color: MUTED, marginTop: 18, lineHeight: 1.6 }}>
          Each diagram animates one cohort of {N}; the comparison table pools {REPS} cohorts per
          scenario ({(N * REPS).toLocaleString()} programmes each). Both scenarios draw from the same
          fixed random strips, so the table's differences are attributable to the switches — but the
          levels themselves still carry sampling error of roughly ±8%.
        </p>
      </div>
    </div>
  );
}
