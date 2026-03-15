/**
 * تحقق سريع من المشروع: وجود ملفات البيئة + بناء الواجهة.
 * الاستخدام: npm run verify
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const serverEnvPath = path.join(root, 'server', '.env');

let failed = false;

console.log('--- التحقق من مشروع Palma Marketplace ---\n');

// 1) ملف البيئة للواجهة
if (fs.existsSync(envPath)) {
  console.log('[OK] وجود ملف .env (الواجهة)');
} else {
  console.log('[تحذير] لا يوجد .env — انسخ .env.example إلى .env واملأ القيم');
  failed = true;
}

// 2) ملف البيئة للباكند
if (fs.existsSync(serverEnvPath)) {
  console.log('[OK] وجود ملف server/.env (الباكند)');
} else {
  console.log('[تحذير] لا يوجد server/.env — انسخ server/.env.example إلى server/.env واملأ القيم');
  failed = true;
}

// 3) node_modules في الجذر
const nodeModules = path.join(root, 'node_modules');
if (fs.existsSync(nodeModules)) {
  console.log('[OK] تبعيات الواجهة (node_modules) موجودة');
} else {
  console.log('[تحذير] نفّذ: npm install');
  failed = true;
}

// 4) بناء الواجهة
console.log('\nجاري بناء الواجهة (npm run build)...');
try {
  execSync('npm run build', {
    cwd: root,
    stdio: 'inherit',
  });
  console.log('[OK] البناء نجح');
} catch (e) {
  console.log('[فشل] البناء انتهى بأخطاء');
  failed = true;
}

console.log('\n--- انتهى التحقق ---');
process.exit(failed ? 1 : 0);
