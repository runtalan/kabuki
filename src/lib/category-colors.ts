// Curated, perceptually distinct category color palette.
//
// The old picker's 17 swatches leaned heavily on adjacent Tailwind hues —
// teal/cyan/sky/blue/indigo/violet all sit within ~40° of each other on the
// color wheel — so most of them read as "the same blue" at icon-badge size.
// This set spreads hues out around the full wheel and varies each one's
// saturation/lightness individually (rather than using a single formula) so
// neighbors are clearly different colors, while staying vivid enough to
// still read well as an icon tint, a `color + '22'` tinted background, and
// a `color` → `color + 'cc'` gradient avatar (see CategoryIcon consumers).
export const CATEGORY_COLORS = [
  '#dc2626', // red
  '#e11d48', // rose
  '#ea580c', // orange
  '#d97706', // amber
  '#ca8a04', // gold
  '#65a30d', // olive
  '#16a34a', // green
  '#059669', // emerald
  '#0d9488', // teal
  '#0891b2', // cyan
  '#2563eb', // blue
  '#4f46e5', // indigo
  '#7c3aed', // violet
  '#9333ea', // purple
  '#c026d3', // fuchsia
  '#db2777', // pink
  '#92400e', // brown
  '#57534e', // stone
  '#475569', // slate
  // A handful of neon options for categories that want to stand out —
  // deliberately much more saturated/bright than the rest of the palette,
  // so use sparingly (they're loud against the muted `color + '22'` tinted
  // backgrounds used elsewhere).
  '#39ff14', // neon green
  '#ff10f0', // neon pink
  '#00e5ff', // neon cyan
  '#faff00', // neon yellow
  '#ff5f1f', // neon orange
  '#bc13fe', // neon purple
] as const;

export const DEFAULT_CATEGORY_COLOR: string = CATEGORY_COLORS[10]; // blue

const COLOR_NAMES: Record<string, string> = {
  '#dc2626': 'Red',
  '#e11d48': 'Rose',
  '#ea580c': 'Orange',
  '#d97706': 'Amber',
  '#ca8a04': 'Gold',
  '#65a30d': 'Olive',
  '#16a34a': 'Green',
  '#059669': 'Emerald',
  '#0d9488': 'Teal',
  '#0891b2': 'Cyan',
  '#2563eb': 'Blue',
  '#4f46e5': 'Indigo',
  '#7c3aed': 'Violet',
  '#9333ea': 'Purple',
  '#c026d3': 'Fuchsia',
  '#db2777': 'Pink',
  '#92400e': 'Brown',
  '#57534e': 'Stone',
  '#475569': 'Slate',
  '#39ff14': 'Radioactive',
  '#ff10f0': 'Bubblegum Blast',
  '#00e5ff': 'Laser Cyan',
  '#faff00': 'Laser Lemon',
  '#ff5f1f': 'Blaze',
  '#bc13fe': 'Ultraviolet',
};

// Human-readable name for a swatch hover tooltip — falls back to the raw
// hex for custom colors outside the curated palette.
export function getColorName(hex: string): string {
  return COLOR_NAMES[hex.toLowerCase()] || hex;
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
