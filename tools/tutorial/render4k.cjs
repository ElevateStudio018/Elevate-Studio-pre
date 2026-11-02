// Renders a timeline film page (window.render(t), window.DUR) to an MP4, frame by frame, piped into ffmpeg.
// Usage: node tools/tutorial/render4k.cjs forslag/film/reklam4.html out.mp4 [scale=3] [fps=30] [part=0] [parts=1]
// With parts > 1 several processes render one slice each; join the slices with ffmpeg's concat.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { spawn } = require('child_process');
const [page, out, scale = '3', fps = '30', part = '0', parts = '1'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +(process.env.W||1280), height: +(process.env.H||720) }, deviceScaleFactor: +scale });
  await p.goto('http://localhost:8767/' + page + '?capture'); await p.evaluate(() => document.fonts.ready); await p.evaluate(() => window.READY);
  const dur = await p.evaluate(() => window.DUR), total = Math.round(dur * +fps), per = Math.ceil(total / +parts), from = +part * per, n = Math.min(total, from + per) - from;
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.render(t), (from + i) / +fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log('frame', i, '/', n);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close(); console.log('klar', out);
})();
