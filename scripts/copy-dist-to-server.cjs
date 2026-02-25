const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const target = path.join(__dirname, '..', 'server', 'public');
if (!fs.existsSync(dist)) {
  console.error('Run npm run build first.');
  process.exit(1);
}
if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
function copyDir(src, dest) {
  fs.readdirSync(src).forEach((f) => {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else fs.copyFileSync(s, d);
  });
}
copyDir(dist, target);
console.log('Done: dist copied to server/public');
