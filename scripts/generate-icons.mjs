// Gera os ícones do app a partir do logo em SVG (bola + setas de rodízio).
// Uso: node scripts/generate-icons.mjs   (requer Microsoft Edge instalado, Windows)
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const Jimp = createRequire(import.meta.url)('jimp-compact');

const ASSETS = resolve('assets');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const C = 512;
const GREEN_LIGHT = '#22C55E';
const GREEN_DARK = '#15803D';

const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const f = (n) => n.toFixed(1);
const poly = (cx, cy, r, rot) =>
  Array.from({ length: 5 }, (_, k) => {
    const a = ((rot + 72 * k) * Math.PI) / 180;
    return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
  }).join(' ');

/** Seta em arco no sentido horário, de `from` até `to` graus, com ponta reta na tangente. */
function arrow(r, from, to, stroke, color) {
  const headLen = 120;
  const headHalf = stroke * 1.15;
  const [x1, y1] = pt(r, from);
  const [bx, by] = pt(r, to);
  const a = (to * Math.PI) / 180;
  const tx = -Math.sin(a);
  const ty = Math.cos(a);
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  const tip = [bx + tx * headLen, by + ty * headLen];
  const outer = [bx + nx * headHalf, by + ny * headHalf];
  const inner = [bx - nx * headHalf, by - ny * headHalf];
  return `
    <path d="M${f(x1)} ${f(y1)} A${r} ${r} 0 0 1 ${f(bx)} ${f(by)}" fill="none" stroke="${color}"
      stroke-width="${stroke}" stroke-linecap="round"/>
    <polygon points="${f(tip[0])},${f(tip[1])} ${f(outer[0])},${f(outer[1])} ${f(inner[0])},${f(inner[1])}"
      fill="${color}" stroke="${color}" stroke-width="12" stroke-linejoin="round"/>`;
}

/** Desenho do logo em 1024x1024. Os gomos da bola são recortes (transparentes). */
function logo(color = '#FFFFFF') {
  const ballR = 196;
  const cut = [];
  cut.push(`<polygon points="${poly(C, C, 64, -90)}"/>`);
  for (let k = 0; k < 5; k++) {
    const deg = -90 + 72 * k;
    const [x1, y1] = pt(56, deg);
    const [x2, y2] = pt(140, deg);
    cut.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="black" stroke-width="16"/>`);
    const [px, py] = pt(196, deg);
    cut.push(`<polygon points="${poly(px, py, 56, deg + 180)}"/>`);
  }
  return `
    <defs>
      <mask id="ball">
        <circle cx="${C}" cy="${C}" r="${ballR}" fill="white"/>
        <g fill="black">${cut.join('')}</g>
      </mask>
    </defs>
    <circle cx="${C}" cy="${C}" r="${ballR}" fill="${color}" mask="url(#ball)"/>
    <circle cx="${C}" cy="${C}" r="${ballR - 9}" fill="none" stroke="${color}" stroke-width="18"/>
    ${arrow(338, 205, 318, 50, color)}
    ${arrow(338, 25, 138, 50, color)}`;
}

const background = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GREEN_LIGHT}"/>
      <stop offset="1" stop-color="${GREEN_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>`;

const svg = (body, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`;

// Zona segura do ícone adaptativo do Android: ~61% central.
const scaled = (s, body) => `<g transform="translate(${C * (1 - s)} ${C * (1 - s)}) scale(${s})">${body}</g>`;

const outputs = {
  'icon.png': [svg(background + scaled(0.9, logo())), 1024],
  'android-icon-background.png': [svg(background), 1024],
  'android-icon-foreground.png': [svg(scaled(0.74, logo())), 1024],
  'android-icon-monochrome.png': [svg(scaled(0.74, logo('#FFFFFF'))), 1024],
  'splash-icon.png': [svg(scaled(0.9, logo())), 1024],
};

writeFileSync(join(ASSETS, 'logo.svg'), svg(background + scaled(0.9, logo())));

const tmp = join(tmpdir(), 'pelada-icons');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

for (const [name, [markup, size]] of Object.entries(outputs)) {
  const html = join(tmp, `${name}.html`);
  writeFileSync(
    html,
    `<html><body style="margin:0;background:transparent">
      <div style="width:${size}px;height:${size}px">${markup}</div>
    </body></html>`,
  );
  execFileSync(EDGE, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${size},${size}`,
    `--screenshot=${join(ASSETS, name)}`,
    pathToFileURL(html).href,
  ]);
  console.log('✓', name);
}

// O Edge não abre janelas tão pequenas; o favicon sai do ícone reduzido.
const favicon = await Jimp.read(join(ASSETS, 'icon.png'));
await favicon.resize(48, 48).writeAsync(join(ASSETS, 'favicon.png'));
console.log('✓ favicon.png');
