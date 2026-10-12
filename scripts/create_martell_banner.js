const sharp = require('sharp');

async function createMartellBanner() {
  const width = 116;
  const height = 201;
  const scale = width / 99;

  // 1. Base Banner SVG (Figma Group 14 fill: #FF8830)
  const baseSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 99 171.5" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0H99V118.609L49.5 171L0 118.609V0Z" fill="#FF8830" />
      <path d="M0 29H99V119.109L49.5 171.5L0 119.109V29Z" fill="#FF8830" />
    </svg>
  `);
  const baseBuffer = await sharp(baseSvg).png().toBuffer();

  // 2. Resize sigil image (Figma width: 83, height: 113, left: 8, top: 9)
  const sigilW = Math.round(83 * scale);
  const sigilH = Math.round(113 * scale);
  const sigilLeft = Math.round(8 * scale);
  const sigilTop = Math.round(9 * scale);

  const sigilBuffer = await sharp('temp/martell_sigil.png')
    .resize(sigilW, sigilH, { fit: 'fill' })
    .png()
    .toBuffer();

  // 3. Composite base + sigil
  const composed = await sharp(baseBuffer)
    .composite([
      { input: sigilBuffer, left: sigilLeft, top: sigilTop }
    ])
    .png()
    .toBuffer();

  // 4. Chevron mask
  const maskSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 99 171.5" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0H99V118.609L49.5 171L0 118.609V0Z" fill="white" />
    </svg>
  `);
  const maskBuffer = await sharp(maskSvg).png().toBuffer();

  await sharp(composed)
    .composite([{ input: maskBuffer, blend: 'dest-in' }])
    .png()
    .toFile('public/images/banners/clan_martell.png');

  console.log('Created public/images/banners/clan_martell.png successfully!');
}

createMartellBanner().catch(console.error);
