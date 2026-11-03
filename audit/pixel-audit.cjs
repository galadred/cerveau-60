// Usage : npm run audit:visual (nécessite Playwright + Chromium installés sur la machine).
// Audit visuel : rastérise chaque case et compare les pixels réellement affichés.
const { chromium } = require('playwright');
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body style="background:#16171b"></body></html>');
  const report = await page.evaluate(async (data) => {
    const SIZE = 48;
    const cache = new Map();
    async function pixels(svg) {
      if (cache.has(svg)) return cache.get(svg);
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      const c = document.createElement('canvas');
      c.width = SIZE; c.height = SIZE;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#16171b'; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const px = ctx.getImageData(0, 0, SIZE, SIZE).data;
      cache.set(svg, px);
      return px;
    }
    // nombre de pixels nettement différents (écart > 60 sur un canal)
    function diff(a, b) {
      let n = 0;
      for (let k = 0; k < a.length; k += 4) {
        if (Math.abs(a[k] - b[k]) > 60 || Math.abs(a[k + 1] - b[k + 1]) > 60 || Math.abs(a[k + 2] - b[k + 2]) > 60) n++;
      }
      return n;
    }
    const VISIBLE = 4; // au-delà : différence perceptible ; en deçà : bruit d'anticrénelage
    const problems = [];
    const stats = {};
    for (const [idx, p] of data.entries()) {
      const key = `${p.kind} I${p.i}`;
      stats[key] ??= { n: 0, minAnswer: Infinity, maxOther: 0, ghosts: 0 };
      const st = stats[key];
      st.n++;
      let diffs;
      if (p.kind === 'difference') {
        diffs = [];
        for (let k = 0; k < p.left.length; k++) diffs.push(diff(await pixels(p.left[k]), await pixels(p.right[k])));
      } else {
        // intrus : comparer chaque case à la case majoritaire (n'importe quelle case non-réponse)
        const ref = await pixels(p.grid[p.answer === 0 ? 1 : 0]);
        diffs = [];
        for (let k = 0; k < p.grid.length; k++) diffs.push(diff(ref, await pixels(p.grid[k])));
      }
      const visible = diffs.map((d, k) => [d, k]).filter(([d]) => d > VISIBLE).map(([, k]) => k);
      const ans = diffs[p.answer];
      st.minAnswer = Math.min(st.minAnswer, ans);
      const others = diffs.filter((_, k) => k !== p.answer);
      const maxOther = Math.max(...others);
      st.maxOther = Math.max(st.maxOther, maxOther);
      if (maxOther > 0) st.ghosts++;
      if (visible.length !== 1 || visible[0] !== p.answer) {
        problems.push({ idx, kind: p.kind, i: p.i, answer: p.answer, visible, ansPixels: ans, maxOther, expl: p.expl });
      }
    }
    return { stats, problems: problems.slice(0, 15), problemCount: problems.length };
  }, data);
  for (const [k, v] of Object.entries(report.stats)) {
    console.log(`${k.padEnd(16)} n=${v.n}  pixels écart (réponse, min)=${v.minAnswer}  autres cases (max)=${v.maxOther}  puzzles avec écart fantôme=${v.ghosts}`);
  }
  console.log(`\nPROBLÈMES : ${report.problemCount}`);
  for (const p of report.problems) console.log(JSON.stringify(p));
  fs.writeFileSync(process.argv[2].replace('.json', '-problems.json'), JSON.stringify(report.problems));
  await browser.close();
})();
