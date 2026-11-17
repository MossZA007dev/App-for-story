interface CharacterHouseBannerProps {
  universe: string;
  faction?: string;
  characterName: string;
}

const houses = [
  { name: "House Stark", pattern: /\bstark\b|สตาร์ค|สตาร์ก/iu, file: "clan_stark.png" },
  { name: "House Lannister", pattern: /\blannister\b|แลนนิสเตอร์/iu, file: "clan_lannister.png" },
  { name: "House Targaryen", pattern: /\btargaryen\b|ทาร์แกเรียน|ทาร์กาเรียน/iu, file: "clan_targaryen.png" },
  { name: "House Tyrell", pattern: /\btyrell\b|ไทเรล|ไทเรลล์/iu, file: "clan_tyrell.png" },
  { name: "House Martell", pattern: /\bmartell\b|มาร์เทล|มาร์เทลล์/iu, file: "clan_martell.png" },
  { name: "Night’s Watch", pattern: /\bnight[’']?s?\s+watch\b|ไนท์วอทช์|ไนท์สวอทช์/iu, file: "clan_watch.png" },
];

export function CharacterHouseBanner({ universe, faction, characterName }: CharacterHouseBannerProps) {
  // Heraldry belongs to its source world, not to a matching surname in any story.
  if (!/\bgame\s+of\s+thrones\b|\bhouse\s+of\s+the\s+dragon\b|\ba\s+song\s+of\s+ice\s+and\s+fire\b|^got$|มหาศึกชิงบัลลังก์|ศึกมังกรชิงบัลลังก์/iu.test(universe.trim())) return null;
  const house = houses.find(item => item.pattern.test(faction?.trim() || characterName));
  if (!house) return null;

  return (
    <span className="character-house-banner" title={`สังกัด ${house.name}`}>
      {/* Existing heraldic artwork, displayed at its original proportions. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/images/banners/${house.file}`} alt={`ตรา ${house.name}`} loading="lazy" width={116} height={201} />
    </span>
  );
}
