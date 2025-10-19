#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const cleanNodeModules = args.includes('--clean');

function run(command, options = {}) {
  console.log(`\n> ${command}\n`);
  try {
    execSync(command, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
  } catch (error) {
    console.error(`\nError executing: ${command}`);
    process.exit(1);
  }
}

function cleanDemo() {
  const demoNodeModules = path.join(__dirname, '..', 'demo', 'node_modules');
  if (fs.existsSync(demoNodeModules)) {
    console.log('\n> Cleaning demo/node_modules...\n');
    fs.rmSync(demoNodeModules, { recursive: true, force: true });
    console.log('✓ Demo node_modules cleaned');
  }
}

async function main() {
  console.log('🚀 Starting automated demo setup...\n');
  console.log('This will:');
  console.log('  1. Clean tooldb packages');
  console.log('  2. Build tooldb packages');
  if (cleanNodeModules) {
    console.log('  3. Clean demo node_modules');
    console.log('  4. Install demo dependencies');
    console.log('  5. Start demo dev server');
  } else {
    console.log('  3. Install/update demo dependencies');
    console.log('  4. Start demo dev server');
  }
  console.log('\n' + '='.repeat(50));

  // Step 1: Clean packages
  console.log('\n📦 Step 1: Cleaning packages...');
  run('npm run clean');

  // Step 2: Build packages
  console.log('\n🔨 Step 2: Building packages...');
  run('npm run build');

  // Step 3: Clean demo node_modules if requested
  if (cleanNodeModules) {
    console.log('\n🧹 Step 3: Cleaning demo node_modules...');
    cleanDemo();
  }

  // Step 4: Install demo dependencies
  console.log(`\n📥 Step ${cleanNodeModules ? 4 : 3}: Installing demo dependencies...`);
  run('npm install', { cwd: path.join(__dirname, '..', 'demo') });

  // Step 5: Start demo
  console.log(`\n🎯 Step ${cleanNodeModules ? 5 : 4}: Starting demo dev server...\n`);
  console.log('='.repeat(50));
  run('npm run dev', { cwd: path.join(__dirname, '..', 'demo') });
}

main();

