#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bumpType = process.argv[2];

if (!bumpType) {
  console.error('Usage: node bump-version.js [patch|minor|major|X.Y.Z]');
  process.exit(1);
}

// Read current version
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Calculate new version
let newVersion;
const [major, minor, patch] = currentVersion.split('.').map(Number);

if (bumpType === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
  newVersion = bumpType;
} else {
  console.error('Invalid version format. Use patch, minor, major or X.Y.Z');
  process.exit(1);
}

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✓ Updated package.json');

// Update Cargo.toml
const cargoTomlPath = path.join(__dirname, '../src-tauri/Cargo.toml');
const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
const updatedCargoToml = cargoToml.replace(
  /^version = "[\d.]+"/m,
  `version = "${newVersion}"`
);
fs.writeFileSync(cargoTomlPath, updatedCargoToml);
console.log('✓ Updated src-tauri/Cargo.toml');

// Update tauri.conf.json
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log('✓ Updated src-tauri/tauri.conf.json');

// Generate release notes from commits
console.log('\n📝 Generating release notes...');
try {
  require('./generate-changelog.js');
} catch (error) {
  console.warn('⚠️  Could not generate release notes:', error.message);
}

// Git commit and tag
try {
  execSync('git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json RELEASE_NOTES.md', {
    stdio: 'inherit'
  });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, {
    stdio: 'inherit'
  });
  execSync(`git tag v${newVersion}`, {
    stdio: 'inherit'
  });
  console.log(`\n✅ Version bumped to ${newVersion}`);
  console.log(`\n📌 Tag created: v${newVersion}`);
  console.log(`\n📤 To push the tag to remote: git push origin v${newVersion}`);
  console.log(`\n💡 Or push everything: git push origin develop --tags`);
} catch (error) {
  console.error('❌ Git commit or tag failed:', error.message);
  process.exit(1);
}
