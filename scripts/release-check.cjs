const fs = require('fs');
const required = ['package.json', 'capacitor.config.json', 'index.html', 'src/App.jsx', 'public/icon-512.png'];
let ok = true;
for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`Missing required file: ${file}`);
    ok = false;
  }
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const dep of ['@capacitor/core', '@capacitor/cli', '@capacitor/android', 'vite', 'react', 'react-dom']) {
  if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
    console.error(`Missing dependency: ${dep}`);
    ok = false;
  }
}
const cap = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
if (cap.appName !== 'CashNest X') {
  console.error('Wrong Capacitor appName. Expected CashNest X');
  ok = false;
}
if (!cap.appId || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(cap.appId)) {
  console.error('Invalid Capacitor appId. Use a Java package like com.cashnest.pub or com.yourname.cashnest_x');
  ok = false;
}
const appConfig = fs.readFileSync('src/config/appConfig.js', 'utf8');
for (const token of ['VITE_ENABLE_FIREBASE_AUTH', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_WEB_CLIENT_ID']) {
  if (!appConfig.includes(token)) {
    console.error(`Firebase auth config is missing from appConfig.js: ${token}`);
    ok = false;
  }
}
const removedProviderName = ['supa', 'base'].join('');
if (appConfig.includes('VITE_' + removedProviderName.toUpperCase() + '_') || appConfig.toLowerCase().includes(removedProviderName)) {
  console.error('Removed legacy cloud provider config must not remain in appConfig.js');
  ok = false;
}
const workflow = fs.readFileSync('.github/workflows/CashNest-X1.yml', 'utf8');
for (const token of ['GOOGLE_BACKUP_NATIVE_ENABLED', 'play-services-auth', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_WEB_CLIENT_ID']) {
  if (!workflow.includes(token)) {
    console.error(`Workflow must support Firebase Google login: ${token}`);
    ok = false;
  }
}

if (workflow.includes('import com.getcapacitor.ActivityResult;')) {
  console.error('Workflow uses the wrong ActivityResult import for Capacitor 6. Use androidx.activity.result.ActivityResult.');
  ok = false;
}
if (!workflow.includes('import androidx.activity.result.ActivityResult;')) {
  console.error('Workflow must import androidx.activity.result.ActivityResult for Capacitor 6 Google sign-in callback.');
  ok = false;
}
const worker = fs.readFileSync('cloudflare-worker/src/index.js', 'utf8');
for (const token of ['FIREBASE_PROJECT_ID', 'Authorization', 'securetoken.google.com', 'cashnest_x:user:']) {
  if (!worker.includes(token)) {
    console.error(`Worker must verify Firebase users and use per-user KV keys: ${token}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log(`Release check passed for CashNest X APK build (${cap.appId}).`);
