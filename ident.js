const addrs = process.argv.slice(2);
for (const a of addrs) {
  (async () => {
    try {
      const url = 'https://explorer.inkonchain.com/api?module=contract&action=getsourcecode&address=' + a;
      const r = await fetch(url);
      const j = await r.json();
      const s = j.result && j.result[0];
      if (!s) { console.log(a, 'NO RESULT'); return; }
      const verified = s.ABI && s.ABI !== 'Contract source code not verified';
      console.log(JSON.stringify({ a, name: s.ContractName, verified: !!verified, compiler: s.CompilerVersion, impl: s.ImplementationAddress, proxy: s.Proxy, evil: s.EVMVersion }));
    } catch (e) { console.log(a, 'ERR', e.message.slice(0, 200)); }
  })();
}
