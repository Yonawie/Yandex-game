export type StyleId =
  | "echo"
  | "cosmos"
  | "railway"
  | "ocean"
  | "ink"
  | "volcano"
  | "candy"
  | "rink"
  | "library"
  | "desert"
  | "noir";

export type StylePattern =
  | "caustics"
  | "stars"
  | "rails"
  | "waves"
  | "ink"
  | "embers"
  | "sugar"
  | "frost"
  | "pages"
  | "sand"
  | "rain";

export type VisualStyle = {
  id: StyleId;
  name: string;
  tagline: string;
  price: number;
  pattern: StylePattern;
  /** Background gradient stops */
  bg: [string, string, string];
  accent: string;
  accentHot: string;
  rare: string;
  brick: string;
  brickDeep: string;
  brickHi: string;
  ink: string;
  muted: string;
  danger: string;
  panel: string;
  letter: string;
  particle: [string, string, string];
  trayGlow: string;
  breakLabel: string;
};

export const STYLES: VisualStyle[] = [
  {
    id: "echo",
    name: "Эхо Премиум",
    tagline: "Янтарь · коралл · глубокая вода",
    price: 0,
    pattern: "caustics",
    bg: ["#0A0610", "#12262E", "#0B3A42"],
    accent: "#5CE1FF",
    accentHot: "#F4FFFD",
    rare: "#FF4D7A",
    brick: "#F0B35A",
    brickDeep: "#8A3E16",
    brickHi: "#FFE2A8",
    ink: "#F7FBFD",
    muted: "#7EB8C6",
    danger: "#FF5A3C",
    panel: "rgba(6, 14, 22, 0.82)",
    letter: "#1A0C04",
    particle: ["#D6F7FF", "#FF4D7A", "#F0B35A"],
    trayGlow: "rgba(255,77,122,0.95)",
    breakLabel: "стекло",
  },
  {
    id: "cosmos",
    name: "Космос",
    tagline: "Хром · туманность · звёздная пыль",
    price: 200,
    pattern: "stars",
    bg: ["#050612", "#12163A", "#1A0B2E"],
    accent: "#8AB4FF",
    accentHot: "#E4ECFF",
    rare: "#C77DFF",
    brick: "#C9D4E8",
    brickDeep: "#5A6A88",
    brickHi: "#F0F4FF",
    ink: "#0B1020",
    muted: "#9AABB8",
    danger: "#FF5E7A",
    panel: "rgba(6, 8, 24, 0.82)",
    letter: "#101628",
    particle: ["#9DB7FF", "#E4B7FF", "#FFFFFF"],
    trayGlow: "rgba(154,183,255,0.95)",
    breakLabel: "кристалл",
  },
  {
    id: "railway",
    name: "Депо",
    tagline: "Заклёпки · сталь · сигнальные огни",
    price: 350,
    pattern: "rails",
    bg: ["#140E0A", "#241810", "#1A120C"],
    accent: "#F0A202",
    accentHot: "#FFE08A",
    rare: "#E63946",
    brick: "#8A9096",
    brickDeep: "#3E444A",
    brickHi: "#C5CBD1",
    ink: "#F4EDE4",
    muted: "#A89884",
    danger: "#FF4D00",
    panel: "rgba(18, 12, 8, 0.82)",
    letter: "#121212",
    particle: ["#F0A202", "#E63946", "#D0D5DA"],
    trayGlow: "rgba(240,162,2,0.95)",
    breakLabel: "клёпки",
  },
  {
    id: "ocean",
    name: "Бездна",
    tagline: "Каустики · стекло · ракушечный блеск",
    price: 450,
    pattern: "waves",
    bg: ["#02121C", "#063A48", "#0B5A62"],
    accent: "#5CE1E6",
    accentHot: "#D7FFFB",
    rare: "#FF8FAB",
    brick: "#66C2C9",
    brickDeep: "#1C6B72",
    brickHi: "#B8F3F0",
    ink: "#E8FFFC",
    muted: "#7FB8B8",
    danger: "#FF6B4A",
    panel: "rgba(2, 24, 34, 0.8)",
    letter: "#042028",
    particle: ["#7FF0EA", "#FFE8C2", "#8ED8FF"],
    trayGlow: "rgba(92,225,230,0.95)",
    breakLabel: "пена",
  },
  {
    id: "ink",
    name: "Тушь",
    tagline: "Васи · каллиграфия · алая печать",
    price: 500,
    pattern: "ink",
    bg: ["#F2E8D5", "#E4D2B0", "#CBB48A"],
    accent: "#1C1C1C",
    accentHot: "#3A3A3A",
    rare: "#C1121F",
    brick: "#F7F0E2",
    brickDeep: "#CDB890",
    brickHi: "#FFFBF2",
    ink: "#141414",
    muted: "#6B5B45",
    danger: "#9B1C1C",
    panel: "rgba(245, 236, 214, 0.88)",
    letter: "#111111",
    particle: ["#1C1C1C", "#C1121F", "#E8DCC0"],
    trayGlow: "rgba(193,18,31,0.9)",
    breakLabel: "чернила",
  },
  {
    id: "volcano",
    name: "Вулкан",
    tagline: "Обсидиан · лава · пепел",
    price: 550,
    pattern: "embers",
    bg: ["#120806", "#2A1008", "#1A0A06"],
    accent: "#FF7A18",
    accentHot: "#FFD166",
    rare: "#FF3D00",
    brick: "#2B2B2B",
    brickDeep: "#0E0E0E",
    brickHi: "#5A5A5A",
    ink: "#FFE8D0",
    muted: "#A08070",
    danger: "#FF2E00",
    panel: "rgba(16, 6, 4, 0.85)",
    letter: "#FFE0B8",
    particle: ["#FF7A18", "#FF3D00", "#FFD166"],
    trayGlow: "rgba(255,122,24,0.95)",
    breakLabel: "лава",
  },
  {
    id: "candy",
    name: "Кондитерская",
    tagline: "Глазурь · пастель · сахарный хруст",
    price: 300,
    pattern: "sugar",
    bg: ["#FFE8F0", "#FFF0D8", "#E8F6FF"],
    accent: "#FF6FAE",
    accentHot: "#FFD6E8",
    rare: "#7C5CFF",
    brick: "#FFC2D4",
    brickDeep: "#E88AAD",
    brickHi: "#FFE3EC",
    ink: "#4A2A3A",
    muted: "#A08090",
    danger: "#FF4D6D",
    panel: "rgba(255, 248, 250, 0.86)",
    letter: "#4A2038",
    particle: ["#FF6FAE", "#FFD166", "#7C5CFF"],
    trayGlow: "rgba(255,111,174,0.95)",
    breakLabel: "крошка",
  },
  {
    id: "rink",
    name: "Ледовый",
    tagline: "Поликарбонат · иней · голограммы",
    price: 480,
    pattern: "frost",
    bg: ["#0A1A28", "#123448", "#1C4A5E"],
    accent: "#7EE0FF",
    accentHot: "#E7FBFF",
    rare: "#B8FF6A",
    brick: "#B7D8E8",
    brickDeep: "#4F7E96",
    brickHi: "#EAF7FF",
    ink: "#062030",
    muted: "#8AB0C0",
    danger: "#FF6B8A",
    panel: "rgba(8, 24, 36, 0.82)",
    letter: "#0A2430",
    particle: ["#7EE0FF", "#B8FF6A", "#FFFFFF"],
    trayGlow: "rgba(126,224,255,0.95)",
    breakLabel: "лёд",
  },
  {
    id: "library",
    name: "Библиотека",
    tagline: "Кожа · латунь · свечи",
    price: 420,
    pattern: "pages",
    bg: ["#1A120C", "#2C1C12", "#3A2818"],
    accent: "#D4A017",
    accentHot: "#F2D48A",
    rare: "#C45C26",
    brick: "#8B5A2B",
    brickDeep: "#4A2E14",
    brickHi: "#C4884A",
    ink: "#F3E6C8",
    muted: "#B29A78",
    danger: "#B33A1A",
    panel: "rgba(22, 14, 8, 0.86)",
    letter: "#241408",
    particle: ["#D4A017", "#F3E6C8", "#C45C26"],
    trayGlow: "rgba(212,160,23,0.95)",
    breakLabel: "страницы",
  },
  {
    id: "desert",
    name: "Пустыня",
    tagline: "Глина · мираж · латунный скарабей",
    price: 380,
    pattern: "sand",
    bg: ["#2A1A0C", "#5A3A18", "#8A6230"],
    accent: "#E0B14A",
    accentHot: "#FFE4A0",
    rare: "#E86A33",
    brick: "#C48A48",
    brickDeep: "#7A4A20",
    brickHi: "#E8BF7A",
    ink: "#FFF3D8",
    muted: "#C4A878",
    danger: "#D94B1F",
    panel: "rgba(32, 20, 8, 0.82)",
    letter: "#2A1608",
    particle: ["#E0B14A", "#E86A33", "#FFE4A0"],
    trayGlow: "rgba(224,177,74,0.95)",
    breakLabel: "песок",
  },
  {
    id: "noir",
    name: "Неон-нуар",
    tagline: "Мокрый асфальт · вывески · дождь",
    price: 600,
    pattern: "rain",
    bg: ["#07070C", "#12121C", "#1A1220"],
    accent: "#FFB703",
    accentHot: "#FFE08A",
    rare: "#FB5607",
    brick: "#2A2A36",
    brickDeep: "#121218",
    brickHi: "#4A4A5C",
    ink: "#F5F0E8",
    muted: "#8A8898",
    danger: "#FF006E",
    panel: "rgba(8, 8, 14, 0.88)",
    letter: "#F8F4EC",
    particle: ["#FFB703", "#00F5D4", "#FF006E"],
    trayGlow: "rgba(255,183,3,0.95)",
    breakLabel: "неон",
  },
];

export function styleById(id: StyleId): VisualStyle {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}
