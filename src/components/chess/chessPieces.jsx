import React from "react";

const UNICODE = {
  wP: "♙", wR: "♖", wN: "♘", wB: "♗", wQ: "♕", wK: "♔",
  bP: "♟", bR: "♜", bN: "♞", bB: "♝", bQ: "♛", bK: "♚",
};

/** ========== SHAPE PACKS (MODELOS) ========== **/
const SHAPE_PACKS = {
  // 1) Staunton (el que ya tenías)
  staunton: {
    P: `<g><circle cx="22.5" cy="12.5" r="6.2"/><path d="M15.2 24c0-5 3.4-8.6 7.3-8.6h0c3.9 0 7.3 3.6 7.3 8.6v1.8H15.2z"/><path d="M13 27.5h19l2.4 6H10.6z"/><path d="M9.2 37.5h26.6l2.7 5.6H6.5z"/></g>`,
    R: `<g><path d="M9.2 37.5h26.6l2.7 5.6H6.5z"/><path d="M14 36V18h17v18z"/><path d="M13.5 18V11.5h4v3h3v-3h4v3h3v-3h4V18z"/><path d="M14 24h17" opacity="0.22"/><path d="M14 29h17" opacity="0.16"/></g>`,
    N: `<g><path d="M13 38h22l2.5 5.1H10.5z"/><path d="M16.3 36c0-8.2 2.6-14.2 9.4-19.4l-2.2-4.2 5.6-2.4 2.1 4.2c5.6.8 8.8 5.7 8.2 11.4-.5 4.5-3.4 8.1-7.1 10.4H16.3z"/><circle cx="28.6" cy="19.8" r="1.2" fill="rgba(0,0,0,0.35)"/></g>`,
    B: `<g><path d="M14 38h22l2.5 5.1H11.5z"/><path d="M22.5 9.5c4.2 4 6.7 7.7 6.7 11.4 0 3.1-1.1 5.7-2.6 7.9 4 2.3 6.4 5.4 6.4 9.2H11.9c0-3.8 2.5-6.9 6.4-9.2-1.5-2.2-2.6-4.8-2.6-7.9 0-3.7 2.5-7.4 6.8-11.4z"/><path d="M19.5 20.2l6 6" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.4" stroke-linecap="round"/></g>`,
    Q: `<g><path d="M12.2 36.6h20.6l2.5 5.6H9.7z"/><path d="M12.2 36.6l2.7-17.2 7.6 8.3 7.6-8.3 2.7 17.2z"/><circle cx="14.8" cy="17.2" r="2.1"/><circle cx="22.5" cy="15.6" r="2.3"/><circle cx="30.2" cy="17.2" r="2.1"/></g>`,
    K: `<g><path d="M12.2 36.6h20.6l2.5 5.6H9.7z"/><path d="M16 36c0-7.7 3.2-12.3 6.5-16.2-2.5-2.4-3.7-4.8-3.7-7.2 0-3 1.9-5.5 3.7-7.1 1.8 1.6 3.7 4.1 3.7 7.1 0 2.4-1.2 4.8-3.7 7.2 3.3 3.9 6.5 8.5 6.5 16.2H16z"/><path d="M22.5 7.6v6.5" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.6" stroke-linecap="round"/><path d="M19.2 10.8h6.6" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.6" stroke-linecap="round"/></g>`,
  },

  // 2) Modern (más geométrico y distinto)
  modern: {
    P: `<g><circle cx="22.5" cy="12.2" r="5.6"/><path d="M16.3 23.5c1.2-5.4 4.2-8 6.2-8s5 2.6 6.2 8l.6 2.8H15.7z"/><path d="M12 31h21l2.2 4.8H9.8z"/><path d="M10 38h25l2.5 4.8H7.5z"/></g>`,
    R: `<g><path d="M10 38h25l2.5 4.8H7.5z"/><path d="M14 36V18h17v18z"/><path d="M13 18v-6h5v4h4v-4h5v4h4v-4h5v6z"/></g>`,
    N: `<g><path d="M11 38h26l2.6 4.8H8.4z"/><path d="M16 36c0-9 3.5-15 12-20l-2-4 6-2 2 4c4.5 1.7 6.7 6.4 5 11-1.4 3.9-4.9 6.7-9 9H16z"/></g>`,
    B: `<g><path d="M10.5 38h24l2.6 4.8H7.9z"/><path d="M22.5 9c5.6 5.2 8.2 9.6 8.2 13.2 0 3-1 5.3-2.4 7.2 3.6 2 5.6 4.8 5.6 8.6H11.1c0-3.8 2-6.6 5.6-8.6-1.4-1.9-2.4-4.2-2.4-7.2 0-3.6 2.6-8 8.2-13.2z"/><path d="M18.8 19.7l7.4 7.4" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.4" stroke-linecap="round"/></g>`,
    Q: `<g><path d="M10 38h25l2.5 4.8H7.5z"/><path d="M12 36l3-16 7.5 7 7.5-7 3 16z"/><circle cx="14.5" cy="18" r="2.1"/><circle cx="22.5" cy="16.5" r="2.3"/><circle cx="30.5" cy="18" r="2.1"/></g>`,
    K: `<g><path d="M10 38h25l2.5 4.8H7.5z"/><path d="M15.8 36c0-8.5 3.4-13.3 6.7-17.4-2.6-2.4-3.7-4.6-3.7-6.8 0-2.9 1.9-5.2 3.7-6.8 1.8 1.6 3.7 3.9 3.7 6.8 0 2.2-1.1 4.4-3.7 6.8 3.3 4.1 6.7 8.9 6.7 17.4H15.8z"/><path d="M22.5 8v6.2" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.7" stroke-linecap="round"/><path d="M19.4 11.1h6.2" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.7" stroke-linecap="round"/></g>`,
  },

  // 3) Blocky (muy diferente)
  blocky: {
    P: `<g><rect x="18" y="10" width="9" height="9" rx="2"/><rect x="16" y="20" width="13" height="9" rx="2"/><rect x="13" y="30" width="19" height="6" rx="2"/><rect x="10" y="37" width="25" height="5" rx="2"/></g>`,
    R: `<g><rect x="12" y="12" width="21" height="6" rx="1"/><rect x="14" y="18" width="17" height="18" rx="2"/><rect x="10" y="37" width="25" height="5" rx="2"/></g>`,
    N: `<g><rect x="10" y="37" width="25" height="5" rx="2"/><path d="M14 36V18l10-6 7 6v18z"/></g>`,
    B: `<g><rect x="10" y="37" width="25" height="5" rx="2"/><path d="M22.5 10l9 11-9 11-9-11z"/><rect x="16" y="32" width="13" height="4" rx="2"/></g>`,
    Q: `<g><rect x="10" y="37" width="25" height="5" rx="2"/><path d="M12 36l3-16 7.5 7 7.5-7 3 16z"/><rect x="14" y="13" width="17" height="5" rx="2"/></g>`,
    K: `<g><rect x="10" y="37" width="25" height="5" rx="2"/><rect x="16" y="18" width="13" height="18" rx="2"/><rect x="21.4" y="10" width="2.2" height="9"/><rect x="18.5" y="13" width="8" height="2.2"/></g>`,
  },

  // 4) Rounded (muy “friendly”)
  rounded: {
    P: `<g><circle cx="22.5" cy="12.5" r="6.5"/><rect x="15" y="20" width="15" height="10" rx="5"/><rect x="12" y="31" width="21" height="6" rx="3"/><rect x="9" y="38" width="27" height="4.5" rx="2.25"/></g>`,
    R: `<g><rect x="12" y="11.5" width="21" height="6.5" rx="3"/><rect x="14" y="18.5" width="17" height="18" rx="6"/><rect x="9" y="38" width="27" height="4.5" rx="2.25"/></g>`,
    N: `<g><rect x="9" y="38" width="27" height="4.5" rx="2.25"/><path d="M16 36c0-9 4-15 12-20 3 4 5 8 3 12-2 4-7 7-13 8z"/></g>`,
    B: `<g><rect x="9" y="38" width="27" height="4.5" rx="2.25"/><path d="M22.5 10c6 6 9 11 9 15 0 4-2 7-5 9H18.5c-3-2-5-5-5-9 0-4 3-9 9-15z"/><path d="M19 21l7 7" fill="none" stroke="rgba(0,0,0,0.22)" stroke-width="1.4" stroke-linecap="round"/></g>`,
    Q: `<g><rect x="9" y="38" width="27" height="4.5" rx="2.25"/><path d="M12 36l3-16 7.5 7 7.5-7 3 16z"/><circle cx="14.5" cy="18" r="2.2"/><circle cx="22.5" cy="16.5" r="2.4"/><circle cx="30.5" cy="18" r="2.2"/></g>`,
    K: `<g><rect x="9" y="38" width="27" height="4.5" rx="2.25"/><path d="M16 36c0-9 4-13.5 6.5-17-3-2.5-4-5-4-7.5 0-3.2 2-5.6 4-7.2 2 1.6 4 4 4 7.2 0 2.5-1 5-4 7.5 2.5 3.5 6.5 8 6.5 17H16z"/><path d="M22.5 8v6.2" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.7" stroke-linecap="round"/><path d="M19.4 11.1h6.2" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.7" stroke-linecap="round"/></g>`,
  },
};

/** ========== SETS (modelo + paleta) ========== **/
const SETS = {
  staunton3d: {
    label: "Staunton 3D",
    model: "staunton",
    w: { fill: "#F8F8F8", stroke: "#2A2A2A", gloss: "rgba(255,255,255,0.22)" },
    b: { fill: "#2B2B2B", stroke: "#0F0F0F", gloss: "rgba(255,255,255,0.10)" },
    shadow: true,
  },
  modern3d: {
    label: "Modern 3D",
    model: "modern",
    w: { fill: "#F4F7FF", stroke: "#253247", gloss: "rgba(255,255,255,0.20)" },
    b: { fill: "#0B1020", stroke: "#1D2B44", gloss: "rgba(255,255,255,0.10)" },
    shadow: true,
  },
  blocky: {
    label: "Blocky",
    model: "blocky",
    w: { fill: "#FFFFFF", stroke: "#2A2A2A", gloss: null },
    b: { fill: "#111111", stroke: "#000000", gloss: null },
    shadow: false,
  },
  rounded: {
    label: "Rounded",
    model: "rounded",
    w: { fill: "#EFFFF7", stroke: "#1C6B50", gloss: "rgba(255,255,255,0.22)" },
    b: { fill: "#0D3B2C", stroke: "#0A241B", gloss: "rgba(255,255,255,0.10)" },
    shadow: true,
  },
  outline: {
    label: "Outline",
    model: "modern",
    w: { fill: "none", stroke: "#EDEDED", gloss: null },
    b: { fill: "none", stroke: "#5A5A5A", gloss: null },
    shadow: false,
  },
  gold: {
    label: "Gold",
    model: "staunton",
    w: { fill: "#F3D28A", stroke: "#6B4C14", gloss: "rgba(255,255,255,0.22)" },
    b: { fill: "#7B5A1A", stroke: "#2A1A06", gloss: "rgba(255,255,255,0.12)" },
    shadow: true,
  },
  unicode: { label: "Unicode" },
};

export const PIECE_SETS = Object.keys(SETS).map((k) => ({ key: k, label: SETS[k].label }));

function svgTemplate(inner, fill, stroke, gloss, shadow) {
  const defs = `<defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${fill}" stop-opacity="1"/>
      <stop offset="1" stop-color="${fill}" stop-opacity="0.84"/>
    </linearGradient>
  </defs>`;

  const glossLayer = gloss
    ? `<path d="M9 38c6-10 16-16 27-18" fill="none" stroke="${gloss}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`
    : "";

  const shadowFilter = shadow ? `filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.35))"` : "";

  const fillAttr = fill === "none" ? "none" : "url(#g)";

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    ${defs}
    <g ${shadowFilter} fill="${fillAttr}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round">
      ${inner}
    </g>
    ${glossLayer}
  </svg>
  `.trim();
}

const cache = new Map();
function svgToDataUri(svg) {
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export function getPieceDataUri(setKey, pieceCode) {
  if (!pieceCode || setKey === "unicode") return null;

  const set = SETS[setKey] || SETS.staunton3d;
  const model = SHAPE_PACKS[set.model] || SHAPE_PACKS.staunton;

  const side = pieceCode[0] === "w" ? "w" : "b";
  const type = pieceCode[1];

  const key = `${setKey}:${pieceCode}`;
  if (cache.has(key)) return cache.get(key);

  const pal = set[side] || SETS.staunton3d[side];
  const inner = model[type] || "";
  const svg = svgTemplate(inner, pal.fill, pal.stroke, pal.gloss, set.shadow);

  const uri = svgToDataUri(svg);
  cache.set(key, uri);
  return uri;
}

/**
 * Render unificado: siempre en un wrapper fijo.
 * Esto evita que Unicode o imágenes cambien el tamaño del tablero.
 */
export function renderPieceNode(pieceCode, setKey) {
  if (!pieceCode) return null;

  // wrapper fijo (importantísimo para no “romper” el board)
  const Wrapper = ({ children }) => (
    <div className="w-[72%] h-[72%] flex items-center justify-center overflow-hidden">
      {children}
    </div>
  );

  if (setKey === "unicode") {
    const isWhite = pieceCode[0] === "w";
    return (
      <Wrapper>
        <span
          className="leading-none select-none pointer-events-none"
          style={{
            fontSize: "34px",
            color: isWhite ? "#F8F8F8" : "#111111",
            textShadow: isWhite
              ? "0 1px 2px rgba(0,0,0,0.35)"
              : "0 1px 2px rgba(255,255,255,0.25)",
          }}
        >
          {UNICODE[pieceCode]}
        </span>
      </Wrapper>
    );
  }

  const uri = getPieceDataUri(setKey, pieceCode);
  if (!uri) {
    return (
      <Wrapper>
        <span className="leading-none" style={{ fontSize: "34px" }}>
          {UNICODE[pieceCode]}
        </span>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <img
        src={uri}
        alt={pieceCode}
        className="w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />
    </Wrapper>
  );
}