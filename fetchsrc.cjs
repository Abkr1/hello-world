const fs = require('fs');
const addr = process.argv[2];
const out = process.argv[3];
(async () => {
  const url = 'https://explorer.inkonchain.com/api?module=contract&action=getsourcecode&address=' + addr;
  const r = await fetch(url);
  const j = await r.json();
  const s = j.result && j.result[0];
  if (!s) { console.log('no result'); return; }
  const payload = { name: s.ContractName, impl: s.ImplementationAddress, source: s.SourceCode, additional: (s.AdditionalSources || []).map(x => ({ filename: x.Filename, code: x.SourceCode })) };
  fs.writeFileSync(out, JSON.stringify(payload));
  console.log('saved', out, 'name', s.ContractName, 'impl', s.ImplementationAddress, 'srcLen', s.SourceCode.length, 'additional', payload.additional.length);
})();
