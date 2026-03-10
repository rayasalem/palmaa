const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || process.env.HOME;
const assetPath = path.join(
  userProfile,
  '.cursor',
  'projects',
  'c-Users-SsS-73-Downloads-palma-marketplace-10',
  'assets',
  'c__Users__SsS-73_AppData_Roaming_Cursor_User_workspaceStorage_c007280298167e5741643ed959e09d95_images_Gemini_Generated_Image_syo37fsyo37fsyo3-6945815c-5940-4d8c-9e83-b440d39eefbf.png'
);
const destPath = path.join(process.cwd(), 'public', 'hero.png');

if (!fs.existsSync(assetPath)) {
  console.error('Source image not found:', assetPath);
  process.exit(1);
}
fs.copyFileSync(assetPath, destPath);
console.log('Copied hero image to public/hero.png');
