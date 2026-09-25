import { CUSTOM_KEY_PREFIX, type CustomPalette } from "@/lib/customPalettes";
import type { Rgb } from "@/lib/gameBoyColorPalettes";

export type Palette = readonly Rgb[];
// "preset" is the built-in list; "custom" is the user's own saved palettes
// (see customPalettes.ts), which aren't in PALETTE_LIST.
export type PaletteGroup = "hardware" | "boot" | "preset" | "custom";

// Headers within the Preset section.
export type PresetSubgroup = "monochrome" | "duotone" | "twelve";

export interface PaletteEntry {
  key: string;
  label: string;
  group: PaletteGroup;
  subgroup?: PresetSubgroup; // set on every preset, and only on presets
  colors: Palette;
}

// Sections in the order the picker shows them.
export const PALETTE_GROUPS: readonly PaletteGroup[] = ["hardware", "boot", "preset", "custom"];

export const PALETTE_GROUP_LABELS: Record<PaletteGroup, string> = {
  hardware: "Hardware",
  boot: "GBC Boot",
  preset: "Presets",
  custom: "Custom",
};

export const PRESET_SUBGROUP_LABELS: Record<PresetSubgroup, string> = {
  monochrome: "Monochrome",
  duotone: "Duotone",
  twelve: "12 Color",
};

// "Auto" isn't in PALETTE_LIST: it resolves to the running game's GBC palette
// when it has one (see findGameBoyColorPalette), otherwise to the fallback.
// It's shown in the hardware section.
export const AUTO_PALETTE = "auto";
export const AUTO_PALETTE_LABEL = "Auto Palette";
export const AUTO_PALETTE_GROUP: PaletteGroup = "hardware";
export const DEFAULT_PALETTE = AUTO_PALETTE;
export const FALLBACK_PALETTE = "grayscale";

const COLORS_PER_LAYER = 4;

// A palette is 4 colors (shade 0-3, 0 = lightest) used for everything, or 12
// colors: 4 for the background/window, then 4 for OBJ0 sprites, then 4 for
// OBJ1 sprites, like the Game Boy Color. Ppu::framebuffer() bits 2-3 say
// which layer a pixel belongs to (kLayerBackground/kLayerObj0/kLayerObj1).
export function paletteColor(palette: Palette, layer: number, shade: number): Rgb {
  const offset = palette.length > COLORS_PER_LAYER ? layer * COLORS_PER_LAYER : 0;
  return palette[offset + shade];
}

// Shade index (0 = lightest) -> RGB, as produced by Ppu::framebuffer().
// Grouped, in the order the picker lists them.
export const PALETTE_LIST: readonly PaletteEntry[] = [
  {
    key: "grayscale",
    label: "Grayscale",
    group: "hardware",
    colors: [
      [255, 255, 255],
      [170, 170, 170],
      [85, 85, 85],
      [0, 0, 0],
    ],
  },
  {
    key: "inverted",
    label: "Inverted",
    group: "hardware",
    colors: [
      [0, 0, 0],
      [85, 85, 85],
      [170, 170, 170],
      [255, 255, 255],
    ],
  },
  {
    key: "dmg",
    label: "DMG",
    group: "hardware",
    colors: [
      [155, 188, 15],
      [139, 172, 15],
      [48, 98, 48],
      [15, 56, 15],
    ],
  },
  {
    key: "light",
    label: "GB Light",
    group: "hardware",
    colors: [
      [29, 222, 206],
      [25, 199, 179],
      [22, 165, 150],
      [11, 122, 109],
    ],
  },
  {
    key: "pocket",
    label: "GB Pocket",
    group: "hardware",
    colors: [
      [196, 207, 161],
      [139, 149, 109],
      [77, 83, 60],
      [31, 31, 31],
    ],
  },
  {
    key: "sgb",
    label: "Super GB",
    group: "hardware",
    colors: [
      [247, 231, 198],
      [214, 142, 73],
      [166, 55, 37],
      [51, 30, 80],
    ],
  },
  {
    key: "virtual-boy",
    label: "Virtual Boy",
    group: "hardware",
    colors: [
      [239, 0, 0],
      [164, 0, 0],
      [85, 0, 0],
      [0, 0, 0],
    ],
  },
  {
    key: "splash-down",
    label: "Down",
    group: "boot",
    colors: [
      [255, 255, 165], [255, 148, 148], [148, 148, 255], [0, 0, 0], // BG
      [255, 255, 165], [255, 148, 148], [148, 148, 255], [0, 0, 0], // OBJ0
      [255, 255, 165], [255, 148, 148], [148, 148, 255], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-down-a",
    label: "Down + A",
    group: "boot",
    colors: [
      [255, 255, 255], [255, 255, 0], [255, 0, 0], [0, 0, 0], // BG
      [255, 255, 255], [255, 255, 0], [255, 0, 0], [0, 0, 0], // OBJ0
      [255, 255, 255], [255, 255, 0], [255, 0, 0], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-down-b",
    label: "Down + B",
    group: "boot",
    colors: [
      [255, 255, 255], [255, 255, 0], [123, 74, 0], [0, 0, 0], // BG
      [255, 255, 255], [99, 165, 255], [0, 0, 255], [0, 0, 0], // OBJ0
      [255, 255, 255], [123, 255, 49], [0, 132, 0], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-left",
    label: "Left",
    group: "boot",
    colors: [
      [255, 255, 255], [99, 165, 255], [0, 0, 255], [0, 0, 0], // BG
      [255, 255, 255], [255, 132, 132], [148, 58, 58], [0, 0, 0], // OBJ0
      [255, 255, 255], [123, 255, 49], [0, 132, 0], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-left-a",
    label: "Left + A",
    group: "boot",
    colors: [
      [255, 255, 255], [140, 140, 222], [82, 82, 140], [0, 0, 0], // BG
      [255, 255, 255], [255, 132, 132], [148, 58, 58], [0, 0, 0], // OBJ0
      [255, 255, 255], [255, 173, 99], [132, 49, 0], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-left-b",
    label: "Left + B",
    group: "boot",
    colors: [
      [255, 255, 255], [165, 165, 165], [82, 82, 82], [0, 0, 0], // BG
      [255, 255, 255], [165, 165, 165], [82, 82, 82], [0, 0, 0], // OBJ0
      [255, 255, 255], [165, 165, 165], [82, 82, 82], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-right",
    label: "Right",
    group: "boot",
    colors: [
      [255, 255, 255], [82, 255, 0], [255, 66, 0], [0, 0, 0], // BG
      [255, 255, 255], [82, 255, 0], [255, 66, 0], [0, 0, 0], // OBJ0
      [255, 255, 255], [82, 255, 0], [255, 66, 0], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-right-a",
    label: "Right + A",
    group: "boot",
    colors: [
      [255, 255, 255], [123, 255, 49], [0, 99, 197], [0, 0, 0], // BG
      [255, 255, 255], [255, 132, 132], [148, 58, 58], [0, 0, 0], // OBJ0
      [255, 255, 255], [255, 132, 132], [148, 58, 58], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-right-b",
    label: "Right + B",
    group: "boot",
    colors: [
      [0, 0, 0], [0, 132, 132], [255, 222, 0], [255, 255, 255], // BG
      [0, 0, 0], [0, 132, 132], [255, 222, 0], [255, 255, 255], // OBJ0
      [0, 0, 0], [0, 132, 132], [255, 222, 0], [255, 255, 255], // OBJ1
    ],
  },
  {
    key: "splash-up",
    label: "Up",
    group: "boot",
    colors: [
      [255, 255, 255], [255, 173, 99], [132, 49, 0], [0, 0, 0], // BG
      [255, 255, 255], [255, 173, 99], [132, 49, 0], [0, 0, 0], // OBJ0
      [255, 255, 255], [255, 173, 99], [132, 49, 0], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-up-a",
    label: "Up + A",
    group: "boot",
    colors: [
      [255, 255, 255], [255, 132, 132], [148, 58, 58], [0, 0, 0], // BG
      [255, 255, 255], [123, 255, 49], [0, 132, 0], [0, 0, 0], // OBJ0
      [255, 255, 255], [99, 165, 255], [0, 0, 255], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "splash-up-b",
    label: "Up + B",
    group: "boot",
    colors: [
      [255, 230, 197], [206, 156, 132], [132, 107, 41], [90, 49, 8], // BG
      [255, 255, 255], [255, 173, 99], [132, 49, 0], [0, 0, 0], // OBJ0
      [255, 255, 255], [255, 173, 99], [132, 49, 0], [0, 0, 0], // OBJ1
    ],
  },
  {
    key: "neo-dmg",
    label: "Neo DMG",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [218, 251, 221],
      [159, 204, 150],
      [71, 137, 122],
      [13, 64, 73],
    ],
  },
  {
    key: "neo-light",
    label: "Neo Light",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [159, 244, 229],
      [0, 185, 190],
      [0, 95, 140],
      [0, 43, 89],
    ],
  },
  {
    key: "red",
    label: "Red",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [253, 238, 238],
      [232, 180, 180],
      [185, 101, 101],
      [92, 38, 38],
    ],
  },
  {
    key: "blue",
    label: "Blue",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [237, 243, 250],
      [175, 201, 224],
      [95, 132, 172],
      [38, 65, 92],
    ],
  },
  {
    key: "green",
    label: "Green",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [238, 253, 238],
      [180, 232, 180],
      [101, 185, 101],
      [38, 92, 38],
    ],
  },
  {
    key: "orange",
    label: "Orange",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [253, 232, 210],
      [240, 175, 110],
      [200, 120, 60],
      [110, 60, 25],
    ],
  },
  {
    key: "purple",
    label: "Purple",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [247, 238, 253],
      [208, 180, 232],
      [143, 101, 185],
      [62, 38, 92],
    ],
  },
  {
    key: "yellow",
    label: "Yellow",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [253, 251, 230],
      [230, 220, 150],
      [185, 170, 80],
      [92, 85, 35],
    ],
  },
  {
    key: "pink",
    label: "Pink",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [253, 238, 245],
      [235, 170, 195],
      [185, 90, 130],
      [92, 35, 60],
    ],
  },
  {
    key: "brown",
    label: "Brown",
    group: "preset",
    subgroup: "monochrome",
    colors: [
      [245, 230, 210],
      [210, 175, 140],
      [150, 110, 75],
      [75, 50, 30],
    ],
  },
  {
    key: "gold-and-blue",
    label: "Gold & Blue",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [255, 240, 214],
      [240, 165, 90],
      [50, 90, 110],
      [15, 30, 45],
    ],
  },
  {
    key: "coral-reef",
    label: "Coral Reef",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [255, 235, 205],
      [250, 140, 110],
      [40, 120, 130],
      [10, 40, 55],
    ],
  },
  {
    key: "neon",
    label: "Neon",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [255, 214, 240],
      [255, 110, 190],
      [40, 130, 180],
      [10, 20, 60],
    ],
  },
  {
    key: "frostbite",
    label: "Frostbite",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [214, 230, 255],
      [140, 170, 210],
      [150, 90, 60],
      [80, 30, 20],
    ],
  },
  {
    key: "tundra",
    label: "Tundra",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [205, 245, 240],
      [120, 180, 175],
      [150, 100, 60],
      [70, 35, 15],
    ],
  },
  {
    key: "nightfire",
    label: "Nightfire",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [230, 220, 255],
      [150, 140, 200],
      [170, 80, 70],
      [70, 20, 30],
    ],
  },
  {
    key: "cotton-candy",
    label: "Cotton Candy",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [250, 225, 222],
      [255, 166, 158],
      [115, 132, 213],
      [44, 32, 91],
    ],
  },
  {
    key: "watermelon",
    label: "Watermelon",
    group: "preset",
    subgroup: "duotone",
    colors: [
      [252, 222, 234],
      [253, 123, 142],
      [53, 120, 48],
      [1, 40, 36],
    ],
  },
  {
    key: "sunset-arcade",
    label: "Sunset Arcade",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [255, 236, 214], [247, 160, 114], [125, 60, 110], [38, 18, 58], // BG
      [235, 255, 255], [110, 225, 235], [30, 120, 170], [10, 25, 60], // OBJ0
      [255, 255, 220], [255, 225, 90], [210, 110, 30], [60, 20, 20], // OBJ1
    ],
  },
  {
    key: "moonlit-forest",
    label: "Moonlit Forest",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [214, 235, 210], [120, 175, 140], [40, 95, 95], [10, 30, 45], // BG
      [255, 245, 214], [255, 200, 90], [200, 95, 40], [50, 20, 20], // OBJ0
      [240, 235, 255], [185, 170, 235], [105, 90, 170], [30, 25, 60], // OBJ1
    ],
  },
  {
    key: "ember-and-ice",
    label: "Ember & Ice",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [235, 225, 215], [170, 140, 125], [90, 60, 60], [25, 15, 20], // BG
      [255, 240, 180], [255, 170, 40], [215, 60, 20], [70, 10, 10], // OBJ0
      [225, 245, 255], [130, 200, 245], [50, 110, 200], [15, 30, 80], // OBJ1
    ],
  },
  {
    key: "stardust-speedway",
    label: "Stardust Speedway",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [255, 215, 255], [190, 120, 230], [80, 50, 140], [15, 10, 45], // BG
      [255, 250, 200], [240, 215, 90], [170, 130, 40], [50, 35, 15], // OBJ0
      [220, 255, 255], [80, 240, 230], [20, 140, 170], [5, 30, 60], // OBJ1
    ],
  },
  {
    key: "ocean-depths",
    label: "Ocean Depths",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [200, 235, 245], [90, 170, 205], [30, 85, 140], [8, 20, 55], // BG
      [255, 240, 225], [255, 150, 120], [200, 60, 70], [60, 15, 35], // OBJ0
      [255, 250, 200], [240, 215, 90], [170, 130, 40], [50, 35, 15], // OBJ1
    ],
  },
  {
    key: "paper-and-ink",
    label: "Paper & Ink",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [244, 236, 214], [201, 184, 140], [120, 98, 70], [42, 32, 26], // BG
      [244, 236, 214], [214, 120, 100], [150, 40, 40], [50, 10, 15], // OBJ0
      [244, 236, 214], [110, 140, 190], [40, 70, 130], [15, 25, 55], // OBJ1
    ],
  },
  {
    key: "golden-hour",
    label: "Golden Hour",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [255, 240, 214], [240, 165, 90], [50, 90, 110], [15, 30, 45], // BG
      [255, 248, 214], [255, 205, 70], [75, 65, 150], [22, 15, 60], // OBJ0
      [255, 232, 225], [255, 125, 105], [110, 45, 110], [45, 12, 50], // OBJ1
    ],
  },
  {
    key: "dragonfruit",
    label: "Dragonfruit",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [255, 232, 240], [240, 140, 180], [25, 85, 60], [8, 32, 24], // BG
      [250, 255, 200], [190, 230, 80], [50, 50, 140], [15, 15, 60], // OBJ0
      [215, 245, 255], [100, 200, 240], [140, 30, 60], [50, 8, 25], // OBJ1
    ],
  },
  {
    key: "lagoon-glow",
    label: "Lagoon Glow",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [222, 245, 228], [120, 200, 160], [35, 80, 110], [10, 25, 50], // BG
      [255, 238, 220], [255, 150, 90], [150, 40, 90], [55, 10, 45], // OBJ0
      [255, 238, 220], [255, 150, 90], [150, 40, 90], [55, 10, 45], // OBJ1
    ],
  },
  {
    key: "blossom",
    label: "Blossom",
    group: "preset",
    subgroup: "twelve",
    colors: [
      [255, 241, 240], [255, 166, 158], [255, 104, 107], [96, 38, 53], // BG
      [242, 255, 232], [139, 243, 168], [31, 138, 91], [18, 71, 45], // OBJ0
      [250, 248, 255], [232, 199, 230], [142, 123, 184], [53, 40, 85], // OBJ1
    ],
  },
];

const PALETTES_BY_KEY = new Map(PALETTE_LIST.map((entry) => [entry.key, entry]));

export function findPalette(key: string): PaletteEntry | undefined {
  return PALETTES_BY_KEY.get(key);
}

// The colors to draw with for a picker selection: Auto uses the running
// game's GBC palette when it has one (autoPalette), custom keys look in the
// user's saved palettes, everything else is a built-in, and anything unknown
// (e.g. a custom palette that was just deleted) falls back to grayscale.
export function resolvePalette(
  key: string,
  autoPalette: Palette | null,
  customPalettes: readonly CustomPalette[]
): Palette {
  const fallback = PALETTES_BY_KEY.get(FALLBACK_PALETTE)?.colors ?? PALETTE_LIST[0].colors;
  if (key === AUTO_PALETTE) return autoPalette ?? fallback;
  if (key.startsWith(CUSTOM_KEY_PREFIX)) {
    const id = key.slice(CUSTOM_KEY_PREFIX.length);
    return customPalettes.find((palette) => palette.id === id)?.colors ?? fallback;
  }
  return PALETTES_BY_KEY.get(key)?.colors ?? fallback;
}
