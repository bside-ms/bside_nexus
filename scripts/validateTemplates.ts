import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

type CheckResult = {
  template: string;
  missing: string[];
  present: string[];
};

const EXPECTED_BASE = [
  '${Name}',
  '${ProfileNr}',
  '${Address}',
  '${Mail}',
  '${Phone}',
  '${IssuerName}',
  '${ProtocolId}',
];

const expectedForRows = () => {
  const keys: string[] = [];
  for (let i = 1; i <= 4; i++) {
    keys.push(`${`$`}{R${i}KeyId}`);
    keys.push(`${`$`}{R${i}Description}`);
    keys.push(`${`$`}{R${i}KeyType}`);
    keys.push(`${`$`}{R${i}Quantity}`);
  }
  return keys;
};

const EXPECTED_ALL = [...EXPECTED_BASE, ...expectedForRows()];

async function readDocXml(absPath: string): Promise<string> {
  const buf = await fs.readFile(absPath);
  const zip = await JSZip.loadAsync(buf);
  const doc = zip.file('word/document.xml');
  if (!doc) throw new Error(`word/document.xml not found inside ${absPath}`);
  return await doc.async('string');
}

async function checkTemplate(relPath: string): Promise<CheckResult> {
  const abs = path.join(process.cwd(), relPath);
  const xml = await readDocXml(abs);
  const present: string[] = [];
  const missing: string[] = [];
  for (const placeholder of EXPECTED_ALL) {
    if (xml.includes(placeholder)) present.push(placeholder);
    else missing.push(placeholder);
  }
  return { template: relPath, present, missing };
}

async function main() {
  const templates = [
    'public/pdfTemplates/IssuerTemplate.docx',
    'public/pdfTemplates/ReturnTemplate.docx',
  ];

  const results: CheckResult[] = [];
  let exitCode = 0;

  for (const tpl of templates) {
    try {
      const res = await checkTemplate(tpl);
      results.push(res);
      if (res.missing.length > 0) exitCode = 1;
    } catch (e) {
      console.error(`✗ ${tpl}:`, e instanceof Error ? e.message : e);
      exitCode = 1;
    }
  }

  for (const r of results) {
    const ok = r.missing.length === 0;
    console.log(`\n=== ${r.template} ===`);
    if (ok) {
      console.log('✓ Alle erwarteten Platzhalter gefunden.');
    } else {
      console.log('⚠ Fehlende Platzhalter:');
      for (const m of r.missing) console.log('  -', m);
      console.log('\nHinweis: In Word können Platzhalter über mehrere Text-Runs verteilt werden.');
      console.log('Bitte sicherstellen, dass jeder Platzhalter (z. B. ${Name}) in einem einzelnen Run steht.');
    }
  }

  process.exit(exitCode);
}

main().catch((e) => {
  console.error('Unerwarteter Fehler:', e);
  process.exit(1);
});
