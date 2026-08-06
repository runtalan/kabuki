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
] as const;

export const DEFAULT_CATEGORY_COLOR: string = CATEGORY_COLORS[10]; // blue

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
