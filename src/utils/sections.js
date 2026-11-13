// Section definitions shared by the games and the Review page.
//
// Each data file is loaded on demand (dynamic import) instead of being
// bundled into every page load. Exam mode uses the small hand-picked
// high-yield files in data/exam/, Hard mode the full question bank.
const DATA = {
  moa: { exam: () => import('../data/exam/moa.json'), hard: () => import('../data/moa.json') },
  adr: { exam: () => import('../data/exam/adr.json'), hard: () => import('../data/adr.json') },
  doc: { exam: () => import('../data/exam/doc.json'), hard: () => import('../data/doc.json') },
};

export const SECTION_META = {
  moa: { title: 'MOA', sub: 'Mechanism of Action', accent: 'teal' },
  adr: { title: 'ADR', sub: 'Adverse Drug Reactions', accent: 'pink' },
  doc: { title: 'DOC', sub: 'Drugs of Choice', accent: 'gold' },
};

export function loadSectionData(section, mode) {
  return DATA[section][mode]();
}
