const sharp = require('sharp');
const fs = require('fs');

async function maskBanners() {
  const width = 116;
  const height = 201;

  const maskSvg = Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 99 171.5" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0H99V118.609L49.5 171L0 118.609V0Z" fill="white" />
    </svg>`
  );

  const maskBuffer = await sharp(maskSvg).png().toBuffer();

  const names = ['stark', 'lannister', 'targaryen', 'tyrell'];
  for (const name of names) {
    const inputPath = `public/images/banners/banner_${name}.png`;
    const outputPath = `public/images/banners/banner_${name}.png`; // overwrite with masked clean png!
    
    const bannerBuffer = await sharp(inputPath).ensureAlpha().toBuffer();

    await sharp(bannerBuffer)
      .composite([{ input: maskBuffer, blend: 'dest-in' }])
      .png()
      .toFile(`public/images/banners/clan_${name}.png`);

    console.log(`Masked clan_${name}.png successfully`);
  }
}
maskBanners().catch(console.error);
