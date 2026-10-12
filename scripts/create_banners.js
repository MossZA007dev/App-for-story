const sharp = require('sharp');

async function createOtherBanners() {
  const width = 116;
  const height = 201;

  // 1. ME (Protagonist) Banner
  const meSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 99 171.5" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
        </filter>
      </defs>
      <path d="M0 0H99V118.609L49.5 171L0 118.609V0Z" fill="#FEF08A" />
      <path d="M0 29H99V119.109L49.5 171.5L0 119.109V29Z" fill="#D97706" />
      <g transform="translate(24.5, 38)" filter="url(#shadow)">
        <path d="M25 2L33 16L48 5L42 35H8L2 5L17 16L25 2Z" fill="#78350F" />
        <circle cx="2" cy="5" r="2.5" fill="#FEF08A" />
        <circle cx="25" cy="2" r="3" fill="#FEF08A" />
        <circle cx="48" cy="5" r="2.5" fill="#FEF08A" />
        <circle cx="14" cy="22" r="2.5" fill="#FEF08A" />
        <circle cx="25" cy="24" r="3" fill="#FEF08A" />
        <circle cx="36" cy="22" r="2.5" fill="#FEF08A" />
      </g>
    </svg>
  `);
  await sharp(meSvg).png().toFile('public/images/banners/clan_me.png');

  // 2. SQUAD Banner
  const squadSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 99 171.5" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
        </filter>
      </defs>
      <path d="M0 0H99V118.609L49.5 171L0 118.609V0Z" fill="#BAE6FD" />
      <path d="M0 29H99V119.109L49.5 171.5L0 119.109V29Z" fill="#0284C7" />
      <g transform="translate(25.5, 36)" filter="url(#shadow)">
        <path d="M24 2L44 8V24C44 36 24 46 24 46C24 46 4 36 4 24V8L24 2Z" fill="#082F49" />
        <path d="M24 6L40 11V23C40 33 24 41 24 41C24 41 8 33 8 23V11L24 6Z" fill="#38BDF8" />
        <circle cx="24" cy="20" r="5" fill="#082F49" />
        <path d="M16 32C16 27 20 26 24 26C28 26 32 27 32 32H16Z" fill="#082F49" />
      </g>
    </svg>
  `);
  await sharp(squadSvg).png().toFile('public/images/banners/clan_squad.png');

  // 3. WATCH (Night's Watch) Banner
  const watchSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 99 171.5" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
        </filter>
      </defs>
      <path d="M0 0H99V118.609L49.5 171L0 118.609V0Z" fill="#9CA3AF" />
      <path d="M0 29H99V119.109L49.5 171.5L0 119.109V29Z" fill="#111827" />
      <g transform="translate(24.5, 36)" filter="url(#shadow)">
        <path d="M6 6L44 44M44 6L6 44" stroke="#000000" stroke-width="6" stroke-linecap="round" />
        <path d="M6 6L44 44M44 6L6 44" stroke="#F3F4F6" stroke-width="3" stroke-linecap="round" />
        <circle cx="25" cy="25" r="7" fill="#111827" stroke="#F3F4F6" stroke-width="2" />
      </g>
    </svg>
  `);
  await sharp(watchSvg).png().toFile('public/images/banners/clan_watch.png');

  console.log('Successfully created all clan banners!');
}
createOtherBanners().catch(console.error);
