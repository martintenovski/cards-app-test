/**
 * 100 softer, less-saturated gradient pairs for card backgrounds.
 * Each entry is [startColor, endColor] as hex strings.
 * Text colour is derived at render time via getContrastColor(startColor).
 */
export const GRADIENTS: ReadonlyArray<[string, string]> = [
  // — Soft Reds / Coral —
  ['#FF8A80', '#F4511E'],
  ['#FFAB91', '#FF7043'],
  ['#EF9A9A', '#E57373'],
  ['#F7977A', '#E06048'],
  ['#FFAAA5', '#FF7675'],
  ['#ED9A91', '#D45F54'],
  ['#FF8C7A', '#E86050'],
  ['#FFA598', '#E87060'],

  // — Rose / Blush —
  ['#F48FB1', '#F06292'],
  ['#F8BBD0', '#F48FB1'],
  ['#EAA1C8', '#D47FB0'],
  ['#FFC7E4', '#F48FBE'],
  ['#DB88A8', '#C26490'],
  ['#F5A7CA', '#E07AAF'],
  ['#E8A0B8', '#D07898'],

  // — Magentas / Fuchsia —
  ['#CE93D8', '#AB47BC'],
  ['#FF80AB', '#F06292'],
  ['#EA80FC', '#CE80E0'],
  ['#C471F5', '#A855D8'],
  ['#D080C0', '#A85098'],

  // — Peach / Orange —
  ['#FFCC80', '#FFA726'],
  ['#FFCBA4', '#FF9B62'],
  ['#FFB74D', '#FFA000'],
  ['#FFBC7A', '#F5963C'],
  ['#FFC896', '#F59864'],
  ['#F5B98A', '#E09060'],
  ['#FDBA7A', '#F5924A'],
  ['#F0C09A', '#E09070'],

  // — Amber / Gold —
  ['#FFE082', '#FFD740'],
  ['#F6DE8A', '#EFC84A'],
  ['#FFD54F', '#FFC107'],
  ['#F9E18B', '#F2C842'],
  ['#FFECB3', '#FFD54F'],
  ['#EDD580', '#D8B840'],
  ['#F5D975', '#E8B83A'],

  // — Lime / Yellow-Green —
  ['#C5E1A5', '#8BC34A'],
  ['#AED581', '#7CB342'],
  ['#DCEDC8', '#AED581'],
  ['#D4E89A', '#A8CC60'],
  ['#C8E690', '#90C040'],
  ['#B8D870', '#88B030'],

  // — Green —
  ['#A5D6A7', '#66BB6A'],
  ['#A8D5A2', '#6CB86A'],
  ['#81C784', '#388E3C'],
  ['#9CCC65', '#689F38'],
  ['#80C98A', '#3E9948'],
  ['#6DC47A', '#3A9048'],
  ['#78C88A', '#409858'],

  // — Teal / Emerald —
  ['#B2DFDB', '#4DB6AC'],
  ['#80CBC4', '#26A69A'],
  ['#ACE5E9', '#5EC8D0'],
  ['#7ECCCA', '#4BB0AE'],
  ['#73D9D0', '#3CB8B0'],
  ['#5EC4BF', '#2EA8A3'],
  ['#88D0C8', '#48A8A0'],

  // — Cyan / Aqua —
  ['#80DEEA', '#26C6DA'],
  ['#B2EBF2', '#80DEEA'],
  ['#4DD0E1', '#00ACC1'],
  ['#84E4EC', '#38C8D8'],
  ['#A0DDE6', '#50B8C8'],

  // — Sky Blue —
  ['#90CAF9', '#42A5F5'],
  ['#BBDEFB', '#90CAF9'],
  ['#64B5F6', '#1E88E5'],
  ['#86C3F5', '#4898E8'],
  ['#93B8E8', '#5080C0'],
  ['#78B0E0', '#4080C0'],
  ['#A8CCF0', '#6098D0'],

  // — Medium Blue —
  ['#82B1FF', '#5E92F3'],
  ['#7EA8E0', '#4A7BBF'],
  ['#6EC6FF', '#2196F3'],
  ['#78A8D8', '#4478B8'],
  ['#7090C8', '#4060A8'],
  ['#8898D8', '#5868B0'],
  ['#7080C0', '#4050A0'],
  ['#7088CC', '#4060A8'],

  // — Indigo —
  ['#9FA8DA', '#5C6BC0'],
  ['#B0B8E0', '#7080C8'],
  ['#9898CC', '#6868A8'],
  ['#8890C8', '#5060A0'],
  ['#9890C8', '#6860A4'],
  ['#A0A8D8', '#6870B8'],

  // — Lavender / Purple —
  ['#B39DDB', '#7E57C2'],
  ['#D1C4E9', '#B39DDB'],
  ['#9B8FCC', '#6B5FB0'],
  ['#A78BCC', '#7D58B0'],
  ['#B8A0DA', '#8860CC'],
  ['#9D8AC8', '#6D5AA8'],
  ['#C0A8E0', '#9070C0'],
  ['#A898D0', '#7868B0'],

  // — Warm Multi-hue —
  ['#FCCB90', '#D7A5E0'],
  ['#F6D365', '#FDA085'],
  ['#FBC2EB', '#A6C1EE'],
  ['#F9D976', '#F39F86'],
  ['#E8C0A0', '#D09878'],

  // — Cool Multi-hue —
  ['#84FAB0', '#8FD3F4'],
  ['#A3CDE8', '#C8A5D8'],
  ['#E0C3FC', '#8EC5FC'],
  ['#96D8F0', '#C0A8E8'],
  ['#A8E8D8', '#90C0E8'],
];
