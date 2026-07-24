import { useState } from 'react';

// Sample figure. Replace the data with your own; the point here is the
// shape of a chart that lives inside an essay: no chart library, plain
// SVG, inherits the page's type and color tokens.
const PHASES = [
  { id: 'pre', name: 'Preclinical', years: 4.0, cost: 12, advance: 0.41, note: 'Target validation through IND-enabling tox. Cheap per program, but the attrition here is invisible in most cost figures.' },
  { id: 'p1', name: 'Phase I', years: 1.6, cost: 25, advance: 0.52, note: 'Safety and dose-finding in healthy volunteers. Fast and comparatively cheap; failures are usually tolerability, not efficacy.' },
  { id: 'p2', name: 'Phase II', years: 2.9, cost: 60, advance: 0.29, note: 'The valley. Efficacy meets reality and roughly seven in ten programs stop here. Enrollment speed dominates cost.' },
  { id: 'p3', name: 'Phase III', years: 3.1, cost: 255, advance: 0.58, note: 'Confirmatory trials at scale. Site activation and patient recruitment are the binding constraints, not science.' },
  { id: 'nda', name: 'Filing', years: 1.3, cost: 40, advance: 0.91, note: 'Submission and review. Document assembly is the least glamorous and most automatable step in the chain.' },
];

const MAX_COST = Math.max(...PHASES.map((p) => p.cost));
const W = 620;
const H = 260;
const PAD = { top: 24, right: 16, bottom: 52, left: 44 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

const totalYears = PHASES.reduce((s, p) => s + p.years, 0);

export default function PhaseEconomics() {
  const [active, setActive] = useState('p2');
  const current = PHASES.find((p) => p.id === active);

  // Bars are laid out along the x axis by *duration*, so width encodes
  // time and height encodes cost. Area is therefore total spend.
  let cursor = 0;
  const bars = PHASES.map((p) => {
    const x = PAD.left + (cursor / totalYears) * plotW;
    const w = (p.years / totalYears) * plotW - 3;
    const h = (p.cost / MAX_COST) * plotH;
    cursor += p.years;
    return { ...p, x, w, h, y: PAD.top + plotH - h };
  });

  return (
    <div style={{ fontFamily: 'var(--serif)' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Cost and duration by clinical development phase"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={PAD.top + plotH - t * plotH}
              y2={PAD.top + plotH - t * plotH}
              stroke="var(--rule)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={PAD.top + plotH - t * plotH + 4}
              textAnchor="end"
              fontFamily="var(--mono)"
              fontSize="10"
              fill="var(--muted)"
            >
              {Math.round(t * MAX_COST)}
            </text>
          </g>
        ))}

        {bars.map((b) => {
          const on = b.id === active;
          return (
            <g
              key={b.id}
              onMouseEnter={() => setActive(b.id)}
              onFocus={() => setActive(b.id)}
              onClick={() => setActive(b.id)}
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={on ? 'var(--accent)' : '#cdd6de'}
              />
              <text
                x={b.x + b.w / 2}
                y={PAD.top + plotH + 16}
                textAnchor="middle"
                fontFamily="var(--mono)"
                fontSize="10"
                fill={on ? 'var(--ink)' : 'var(--muted)'}
              >
                {b.name}
              </text>
              <text
                x={b.x + b.w / 2}
                y={PAD.top + plotH + 30}
                textAnchor="middle"
                fontFamily="var(--mono)"
                fontSize="9"
                fill="var(--muted)"
              >
                {b.years.toFixed(1)}y
              </text>
            </g>
          );
        })}

        <text
          x={PAD.left - 8}
          y={PAD.top - 8}
          textAnchor="end"
          fontFamily="var(--mono)"
          fontSize="9"
          fill="var(--muted)"
        >
          $M
        </text>
      </svg>

      <p style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: '0.75rem 0 0', color: 'var(--ink)' }}>
        <strong style={{ fontWeight: 600 }}>{current.name}</strong>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '0.6rem' }}>
          ${current.cost}M · {current.years.toFixed(1)}y · {Math.round(current.advance * 100)}% advance
        </span>
        <br />
        <span style={{ color: 'var(--muted)' }}>{current.note}</span>
      </p>
    </div>
  );
}
