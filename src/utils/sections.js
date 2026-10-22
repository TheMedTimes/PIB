// Each section's ~50KB data file is loaded on demand (dynamic import)
// instead of all three being bundled into every page load, a visit to
// /moa never has to download ADR's or DOC's data.
export const SECTION_META = {
  moa: { title: 'MOA', sub: 'Mechanism of Action', accent: 'teal', loadData: () => import('../data/moa.json') },
  adr: { title: 'ADR', sub: 'Adverse Drug Reactions', accent: 'pink', loadData: () => import('../data/adr.json') },
  doc: { title: 'DOC', sub: 'Drugs of Choice', accent: 'gold', loadData: () => import('../data/doc.json') },
};
