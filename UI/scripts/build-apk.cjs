const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");

const gradleFile = path.join(rootDir, "android", "app", "build.gradle");

const androidDir = path.join(rootDir, "android");

const apkSource = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);

const apkDestination = path.join(
  rootDir,
  "dist",
  "apk",
  "inventory-manager.apk",
);

// ==================================================
// ARGUMENTO DE VERSÃO
// ==================================================

const versionType = process.argv[2] || "patch";

const validVersionTypes = ["patch", "feat", "major"];

if (!validVersionTypes.includes(versionType)) {
  console.error(`
Tipo de versão inválido: "${versionType}"

Use:

  npm run build:apk
  npm run build:apk -- patch
  npm run build:apk -- feat
  npm run build:apk -- major
`);

  process.exit(1);
}

// ==================================================
// EXECUTAR COMANDO
// ==================================================

function run(command, cwd = rootDir) {
  console.log(`\n> ${command}\n`);

  execSync(command, {
    cwd,
    stdio: "inherit",
  });
}

console.log(`
========================================
 Inventory Manager - Android Build
========================================
`);

console.log(`Tipo de versão: ${versionType}`);

// ==================================================
// LER BUILD.GRADLE
// ==================================================

let gradleContent = fs.readFileSync(gradleFile, "utf8");

// ==================================================
// VERSION CODE
// ==================================================

const versionCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);

if (!versionCodeMatch) {
  throw new Error("versionCode não encontrado no android/app/build.gradle");
}

const currentVersionCode = Number(versionCodeMatch[1]);

const newVersionCode = currentVersionCode + 1;

gradleContent = gradleContent.replace(
  /versionCode\s+\d+/,
  `versionCode ${newVersionCode}`,
);

// ==================================================
// VERSION NAME
// ==================================================

const versionNameMatch = gradleContent.match(/versionName\s+"([^"]+)"/);

if (!versionNameMatch) {
  throw new Error("versionName não encontrado no android/app/build.gradle");
}

const currentVersionName = versionNameMatch[1];

const versionParts = currentVersionName.split(".");

if (
  versionParts.length !== 3 ||
  versionParts.some((part) => !/^\d+$/.test(part))
) {
  throw new Error(
    `versionName inválido: "${currentVersionName}". ` +
      `Use o formato MAJOR.MINOR.PATCH, por exemplo 1.4.0`,
  );
}

let [major, minor, patch] = versionParts.map(Number);

// ==================================================
// INCREMENTAR VERSÃO
// ==================================================

switch (versionType) {
  case "patch":
    patch++;
    break;

  case "feat":
    minor++;
    patch = 0;
    break;

  case "major":
    major++;
    minor = 0;
    patch = 0;
    break;
}

const newVersionName = `${major}.${minor}.${patch}`;

// ==================================================
// SALVAR VERSÕES
// ==================================================

gradleContent = gradleContent.replace(
  /versionName\s+"[^"]+"/,
  `versionName "${newVersionName}"`,
);

fs.writeFileSync(gradleFile, gradleContent, "utf8");

console.log(`✓ versionCode: ${currentVersionCode} → ${newVersionCode}`);

console.log(`✓ versionName: ${currentVersionName} → ${newVersionName}`);

// ==================================================
// BUILD FRONTEND
// ==================================================

run("npm run build");

// ==================================================
// CAPACITOR SYNC
// ==================================================

run("npx cap sync android");

// ==================================================
// CLEAN
// ==================================================

run(".\\gradlew.bat clean", androidDir);

// ==================================================
// ASSEMBLE DEBUG
// ==================================================

run(".\\gradlew.bat assembleDebug", androidDir);

// ==================================================
// VERIFICAR APK
// ==================================================

if (!fs.existsSync(apkSource)) {
  throw new Error(`APK não encontrado em:\n${apkSource}`);
}

// ==================================================
// CRIAR DESTINO
// ==================================================

fs.mkdirSync(path.dirname(apkDestination), {
  recursive: true,
});

// ==================================================
// COPIAR APK
// ==================================================

fs.copyFileSync(apkSource, apkDestination);

// ==================================================
// FINAL
// ==================================================

console.log(`
========================================
 BUILD CONCLUÍDO COM SUCESSO
========================================

Version Code : ${newVersionCode}
Version Name : ${newVersionName}

APK:
${apkDestination}

========================================
`);
