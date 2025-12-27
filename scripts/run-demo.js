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
  const demoNodeModules = path.join(__dirname, '..', 'example', 'node_modules');
  if (fs.existsSync(demoNodeModules)) {
    console.log('\n> Cleaning example/node_modules...\n');
    
    // Use cross-platform deletion method
    // On Windows, use PowerShell Remove-Item for better handling of locked files
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // On Windows, use rmdir command which handles locked files better than fs.rmSync
      // /s = remove directory tree, /q = quiet mode (no confirmation)
      try {
        execSync(`rmdir /s /q "${demoNodeModules}"`, {
          stdio: 'pipe',
          shell: true
        });
      } catch (error) {
        // If rmdir fails, try PowerShell as fallback
        try {
          const escapedPath = demoNodeModules.replace(/'/g, "''");
          execSync(`powershell -Command "Remove-Item -LiteralPath '${escapedPath}' -Recurse -Force -ErrorAction SilentlyContinue"`, {
            stdio: 'pipe',
            shell: true
          });
        } catch (psError) {
          // Last resort: try fs.rmSync
          try {
            fs.rmSync(demoNodeModules, { recursive: true, force: true });
          } catch (fallbackError) {
            console.warn('⚠ Warning: Some files could not be deleted. Continuing anyway...');
            console.warn(`   Error: ${fallbackError.message}`);
          }
        }
      }
    } else {
      // On Unix-like systems, use fs.rmSync
      try {
        fs.rmSync(demoNodeModules, { recursive: true, force: true });
      } catch (error) {
        console.warn('⚠ Warning: Some files could not be deleted. Continuing anyway...');
        console.warn(`   Error: ${error.message}`);
      }
    }
    
    console.log('✓ Example node_modules cleaned');
  }
}

async function main() {
  console.log('🚀 Starting automated demo setup...\n');
  console.log('This will:');
  console.log('  1. Clean tooldb packages');
  console.log('  2. Build tooldb packages');
  if (cleanNodeModules) {
    console.log('  3. Clean example node_modules');
    console.log('  4. Install example dependencies');
    console.log('  5. Start example dev server');
  } else {
    console.log('  3. Install/update example dependencies');
    console.log('  4. Start example dev server');
  }
  console.log('\n' + '='.repeat(50));

  // Step 1: Clean packages
  console.log('\n📦 Step 1: Cleaning packages...');
  run('npm run clean');

  // Step 2: Build packages
  console.log('\n🔨 Step 2: Building packages...');
  run('npm run build');

  // Step 3: Clean example node_modules if requested
  if (cleanNodeModules) {
    console.log('\n🧹 Step 3: Cleaning example node_modules...');
    cleanDemo();
  }

  // Step 4: Install example dependencies
  console.log(`\n📥 Step ${cleanNodeModules ? 4 : 3}: Installing example dependencies...`);
  run('npm install --legacy-peer-deps', { cwd: path.join(__dirname, '..', 'example') });

  // Step 5: Start example
  console.log(`\n🎯 Step ${cleanNodeModules ? 5 : 4}: Starting example dev server...\n`);
  console.log('='.repeat(50));
  run('npm start', { cwd: path.join(__dirname, '..', 'example') });
}

main();

