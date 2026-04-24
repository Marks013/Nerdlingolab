import { readFileSync } from "node:fs";

const css = readFileSync("src/app/globals.css", "utf8");
const variablePattern = /--([a-z-]+):\s*([^;]+);/g;
const themes = {
  light: {},
  dark: {}
};

function parseVariables(blockSelector, themeName) {
  const blockPattern = new RegExp(`${blockSelector}\\s*\\{([\\s\\S]*?)\\}`, "m");
  const blockMatch = css.match(blockPattern);

  if (!blockMatch) {
    throw new Error(`Tema ausente: ${themeName}`);
  }

  for (const match of blockMatch[1].matchAll(variablePattern)) {
    themes[themeName][match[1]] = match[2].trim();
  }
}

function hslToRgb(value) {
  const [h, s, l] = value.split(/\s+/).map((part) => Number.parseFloat(part.replace("%", "")));
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const m = lightness - chroma / 2;
  const [r1, g1, b1] =
    huePrime < 1 ? [chroma, x, 0] :
    huePrime < 2 ? [x, chroma, 0] :
    huePrime < 3 ? [0, chroma, x] :
    huePrime < 4 ? [0, x, chroma] :
    huePrime < 5 ? [x, 0, chroma] :
    [chroma, 0, x];

  return [r1 + m, g1 + m, b1 + m].map((channel) => Math.round(channel * 255));
}

function relativeLuminance([r, g, b]) {
  return [r, g, b]
    .map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(colorA, colorB) {
  const luminanceA = relativeLuminance(hslToRgb(colorA));
  const luminanceB = relativeLuminance(hslToRgb(colorB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (lighter + 0.05) / (darker + 0.05);
}

parseVariables(":root", "light");
parseVariables("\\.dark", "dark");

const pairs = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["muted", "muted-foreground"]
];
const failures = [];

for (const [themeName, values] of Object.entries(themes)) {
  for (const [background, foreground] of pairs) {
    const ratio = contrastRatio(values[background], values[foreground]);

    if (ratio < 4.5) {
      failures.push(`${themeName}: ${background}/${foreground} = ${ratio.toFixed(2)}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`Contraste insuficiente:\n${failures.join("\n")}\n`);
  process.exit(1);
}
