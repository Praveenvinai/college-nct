// National College Trichinopoly Official Assets and Image References

export const NATIONAL_COLLEGE_LOGO_SVG = `
<svg viewBox="0 0 300 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="select-none">
  <!-- Outer Ring Background -->
  <circle cx="150" cy="150" r="142" fill="#181614" stroke="#807368" stroke-width="4"/>
  <circle cx="150" cy="150" r="134" fill="none" stroke="#e0d7d0" stroke-width="2"/>
  <circle cx="150" cy="150" r="102" fill="none" stroke="#807368" stroke-width="1.5"/>

  <!-- Sanskrit Top Text Path -->
  <path id="topArc" d="M 45,150 A 105,105 0 0,1 255,150" fill="none"/>
  <text fill="#e0d7d0" font-size="16" font-weight="bold" font-family="serif" letter-spacing="2">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">
      सा विद्या या विमुक्तये
    </textPath>
  </text>

  <!-- Bottom Text Arc Path -->
  <path id="bottomArc" d="M 38,150 A 112,112 0 0,0 262,150" fill="none"/>
  <text fill="#e0d7d0" font-size="15" font-weight="800" font-family="sans-serif" letter-spacing="2">
    <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">
      NATIONAL COLLEGE
    </textPath>
  </text>

  <!-- Sub Bottom Arc Path -->
  <path id="subBottomArc" d="M 60,150 A 90,90 0 0,0 240,150" fill="none"/>
  <text fill="#998f86" font-size="12" font-weight="700" font-family="sans-serif" letter-spacing="3">
    <textPath href="#subBottomArc" startOffset="50%" text-anchor="middle">
      TRICHINOPOLY
    </textPath>
  </text>

  <!-- Center Artwork: Rising Sun, Horizon, Lotus & Water -->
  <g transform="translate(150, 140)">
    <!-- Sun Rays -->
    <g stroke="#e0d7d0" stroke-width="2" opacity="0.9">
      <line x1="0" y1="0" x2="0" y2="-45" />
      <line x1="0" y1="0" x2="-22" y2="-38" />
      <line x1="0" y1="0" x2="22" y2="-38" />
      <line x1="0" y1="0" x2="-38" y2="-22" />
      <line x1="0" y1="0" x2="38" y2="-22" />
      <line x1="0" y1="0" x2="-45" y2="-8" />
      <line x1="0" y1="0" x2="45" y2="-8" />
      <line x1="0" y1="0" x2="-12" y2="-42" />
      <line x1="0" y1="0" x2="12" y2="-42" />
      <line x1="0" y1="0" x2="-30" y2="-30" />
      <line x1="0" y1="0" x2="30" y2="-30" />
    </g>

    <!-- Rising Sun Semi-Circle -->
    <path d="M -26,0 A 26,26 0 0,1 26,0 Z" fill="#e0d7d0" />

    <!-- Water Waves Horizon Lines -->
    <path d="M -60,4 L 60,4 M -55,10 L 55,10 M -48,16 L 48,16 M -35,22 L 35,22" stroke="#807368" stroke-width="1.5" fill="none" />

    <!-- Blooming Lotus Flower -->
    <g transform="translate(0, -2)">
      <!-- Left Petal -->
      <path d="M 0,4 C -12,-6 -18,2 0,14" fill="#e0d7d0" stroke="#181614" stroke-width="1"/>
      <!-- Right Petal -->
      <path d="M 0,4 C 12,-6 18,2 0,14" fill="#e0d7d0" stroke="#181614" stroke-width="1"/>
      <!-- Outer Left Petal -->
      <path d="M -2,6 C -20,2 -24,12 -6,14" fill="#c7b8ac" stroke="#181614" stroke-width="1"/>
      <!-- Outer Right Petal -->
      <path d="M 2,6 C 20,2 24,12 6,14" fill="#c7b8ac" stroke="#181614" stroke-width="1"/>
      <!-- Center Bud Petal -->
      <path d="M 0,-4 C -6,2 -4,10 0,12 C 4,10 6,2 0,-4" fill="#ffffff" stroke="#181614" stroke-width="1"/>
    </g>

    <!-- Reeds / Plants on the left -->
    <path d="M -50,-8 Q -46,5 -42,12 M -44,-12 Q -42,2 -38,12" stroke="#e0d7d0" stroke-width="1.5" fill="none" />
  </g>
</svg>
`;

// Direct image references based on National College Trichy Campus photos
export const CAMPUS_AERIAL_GATE_URL = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200"; // Modern college campus gate
export const CAMPUS_AUTONOMOUS_GATE_URL = "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&q=80&w=1200"; // Autonomous classical entrance pillars
