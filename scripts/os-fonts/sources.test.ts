import { describe, expect, it } from 'vitest';
import {
  appleHasFamily,
  parseAndroidFontFiles,
  parseAppleSystemFonts,
  parseOsFontListCsv,
  parseUbuntuManifest,
  parseWindowsFontList,
} from './sources';

describe('parseWindowsFontList', () => {
  const html = `
    <table><tbody>
      <tr><th>Family</th><th>Font Name</th></tr>
      <tr><td><a href="x">Arial</a></td><td>Arial</td></tr>
      <tr><td></td><td>Arial Bold</td></tr>
      <tr><td><a>Segoe UI</a></td><td>Segoe UI</td></tr>
    </tbody></table>
    <table><tbody>
      <tr><td><a>Noto Sans Arabic</a></td><td>x</td></tr>
    </tbody></table>`;

  it('treats the first table as preinstalled and later tables as on demand', () => {
    const result = parseWindowsFontList(html);
    expect([...result.preinstalled]).toEqual(['Arial', 'Segoe UI']);
    expect([...result.onDemand]).toEqual(['Noto Sans Arabic']);
  });
});

describe('Apple system fonts', () => {
  const html = `
    <li class="font-item"><span class="filter-font-name">Helvetica</span>
      <span class="filter-type">iOS</span><span class="filter-type">macOS</span></li>
    <li class="font-item"><span class="filter-font-name">Helvetica Neue Bold</span>
      <span class="filter-type">macOS</span></li>
    <li class="font-item"><span class="filter-font-name">Academy Engraved LET Plain:1.0</span>
      <span class="filter-type">iOS</span></li>`;

  it('parses names and platforms', () => {
    const faces = parseAppleSystemFonts(html);
    expect(faces.map((face) => face.name)).toEqual([
      'Helvetica',
      'Helvetica Neue Bold',
      'Academy Engraved LET Plain',
    ]);
    expect(faces[0]?.platforms).toEqual(['iOS', 'macOS']);
  });

  it('matches families by style suffix only', () => {
    const faces = parseAppleSystemFonts(html);
    expect(appleHasFamily(faces, 'Helvetica', 'macOS')).toBe(true);
    expect(appleHasFamily(faces, 'Helvetica', 'iOS')).toBe(true);
    expect(appleHasFamily(faces, 'Helvetica Neue', 'macOS')).toBe(true);
    expect(appleHasFamily(faces, 'Helvetica Neue', 'iOS')).toBe(false);
    expect(appleHasFamily(faces, 'Helvet', 'macOS')).toBe(false);
  });
});

describe('other sources', () => {
  it('reads the family column of an os-font-list CSV', () => {
    expect([
      ...parseOsFontListCsv(
        'Family,Name,Filename\nArial,Arial,Arial.ttf\nArial,Arial Bold,x.ttf\n',
      ),
    ]).toEqual(['Arial']);
  });

  it('collects Android font file names', () => {
    const xml =
      '<family name="serif"><font weight="400" style="normal">NotoSerif-Regular.ttf</font></family>';
    expect([...parseAndroidFontFiles(xml)]).toEqual(['NotoSerif-Regular.ttf']);
  });

  it('collects package names from an Ubuntu manifest', () => {
    expect([...parseUbuntuManifest('fonts-ubuntu\t0.83-6\nxfonts-base 1:1.0\n')]).toEqual([
      'fonts-ubuntu',
      'xfonts-base',
    ]);
  });
});
