import fs from 'fs';
import sharp from 'sharp';

function createSvg(size) {
  const r = Math.round(size * 0.15);
  // Use a circle-based bike icon since emoji rendering varies
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0D9A5E"/>
  <g transform="translate(${size * 0.15}, ${size * 0.2}) scale(${size / 140})">
    <!-- Bike icon -->
    <circle cx="28" cy="70" r="18" fill="none" stroke="white" stroke-width="4"/>
    <circle cx="98" cy="70" r="18" fill="none" stroke="white" stroke-width="4"/>
    <polyline points="28,70 50,35 75,70 98,70" fill="none" stroke="white" stroke-width="4" stroke-linejoin="round"/>
    <polyline points="50,35 70,35" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <line x1="70" y1="35" x2="75" y2="70" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <line x1="42" y1="25" x2="58" y2="25" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <line x1="50" y1="25" x2="50" y2="35" stroke="white" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;
}

function createFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="15" fill="#0D9A5E"/>
  <g transform="translate(12, 18) scale(0.72)">
    <circle cx="28" cy="70" r="18" fill="none" stroke="white" stroke-width="5"/>
    <circle cx="98" cy="70" r="18" fill="none" stroke="white" stroke-width="5"/>
    <polyline points="28,70 50,35 75,70 98,70" fill="none" stroke="white" stroke-width="5" stroke-linejoin="round"/>
    <polyline points="50,35 70,35" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="70" y1="35" x2="75" y2="70" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="42" y1="25" x2="58" y2="25" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="50" y1="25" x2="50" y2="35" stroke="white" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;
}

// Write favicon SVG
fs.writeFileSync('public/favicon.svg', createFaviconSvg());

// Generate PNG icons
const sizes = [192, 512];
for (const size of sizes) {
  const svg = createSvg(size);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/pwa-${size}x${size}.png`);
  console.log(`Created pwa-${size}x${size}.png`);
}

console.log('All icons generated');
