const decode = (text: string) =>
  text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim();

export interface WindowsFamilies {
  preinstalled: Set<string>;
  onDemand: Set<string>;
}

export function parseWindowsFontList(html: string): WindowsFamilies {
  const result: WindowsFamilies = { preinstalled: new Set(), onDemand: new Set() };
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((match) => match[0]);
  for (const [index, table] of tables.entries()) {
    const target = index === 0 ? result.preinstalled : result.onDemand;
    for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const first = /<td[^>]*>([\s\S]*?)<\/td>/.exec(row[1] ?? '');
      const name = first ? decode(first[1] ?? '') : '';
      if (name) target.add(name);
    }
  }
  return result;
}

export interface AppleFace {
  name: string;
  platforms: string[];
}

export function parseAppleSystemFonts(html: string): AppleFace[] {
  const faces: AppleFace[] = [];
  for (const item of html.split('<li class="font-item">').slice(1)) {
    const name = /filter-font-name">([^<]*)/.exec(item)?.[1];
    if (!name) continue;
    const platforms = [...item.matchAll(/filter-type">\s*(\w+)/g)].map((match) => match[1] ?? '');
    faces.push({
      name: decode(name).replace(/:\d+(\.\d+)?$/, ''),
      platforms: [...new Set(platforms)],
    });
  }
  return faces;
}

const STYLE_WORDS = new Set([
  'regular',
  'bold',
  'italic',
  'oblique',
  'light',
  'medium',
  'semibold',
  'demibold',
  'black',
  'heavy',
  'thin',
  'ultralight',
  'extralight',
  'extrabold',
  'roman',
  'book',
  'plain',
]);

export function appleHasFamily(faces: readonly AppleFace[], family: string, platform: string) {
  const wanted = family.toLowerCase();
  return faces.some((face) => {
    if (!face.platforms.includes(platform)) return false;
    const name = face.name.toLowerCase();
    if (name === wanted) return true;
    if (!name.startsWith(`${wanted} `)) return false;
    return name
      .slice(wanted.length + 1)
      .split(/\s+/)
      .every((word) => STYLE_WORDS.has(word));
  });
}

export function parseOsFontListCsv(csv: string): Set<string> {
  const families = new Set<string>();
  for (const line of csv.split(/\r?\n/).slice(1)) {
    const family = line.split(',', 1)[0]?.trim();
    if (family) families.add(family);
  }
  return families;
}

export function parseAndroidFontFiles(xml: string): Set<string> {
  const files = new Set<string>();
  for (const match of xml.matchAll(/<font\b[^>]*>\s*([^<\s][^<]*?)\s*(?:<\/font>|<axis)/g)) {
    files.add((match[1] ?? '').trim());
  }
  return files;
}

export function parseUbuntuManifest(manifest: string): Set<string> {
  const packages = new Set<string>();
  for (const line of manifest.split(/\r?\n/)) {
    const name = line.split(/\s+/, 1)[0];
    if (name) packages.add(name);
  }
  return packages;
}
