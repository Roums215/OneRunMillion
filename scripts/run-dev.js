/**
 * Development startup script for OneRun application
 * Starts both frontend and backend services concurrently
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set paths
const rootDir = path.join(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  frontend: '\x1b[36m', // Cyan
  backend: '\x1b[33m',  // Yellow
  error: '\x1b[31m',    // Red
  success: '\x1b[32m'   // Green
};

// Function to start a process
function startProcess(name, command, args, cwd) {
  console.log(`${colors[name] || colors.reset}Starting ${name}...${colors.reset}`);
  
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'pipe'
  });
  
  proc.stdout.on('data', (data) => {
    console.log(`${colors[name] || colors.reset}[${name}] ${data.toString().trim()}${colors.reset}`);
  });
  
  proc.stderr.on('data', (data) => {
    console.error(`${colors.error}[${name} ERROR] ${data.toString().trim()}${colors.reset}`);
  });
  
  proc.on('close', (code) => {
    if (code !== 0) {
      console.log(`${colors.error}[${name}] process exited with code ${code}${colors.reset}`);
    }
  });
  
  return proc;
}

// Check if package.json exists in both directories
if (!fs.existsSync(path.join(frontendDir, 'package.json'))) {
  console.error(`${colors.error}Frontend package.json not found${colors.reset}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(backendDir, 'package.json'))) {
  console.error(`${colors.error}Backend package.json not found${colors.reset}`);
  process.exit(1);
}

// Start backend and frontend
console.log(`${colors.success}=== Starting OneRun Development Server ===${colors.reset}`);

const backendProc = startProcess('backend', 'npm', ['run', 'dev'], backendDir);
const frontendProc = startProcess('frontend', 'npm', ['start'], frontendDir);

// Handle termination
process.on('SIGINT', () => {
  console.log(`\n${colors.reset}Shutting down services...${colors.reset}`);
  backendProc && backendProc.kill();
  frontendProc && frontendProc.kill();
  process.exit(0);
});

console.log(`${colors.success}=== OneRun services started ===${colors.reset}`);
console.log(`${colors.success}Frontend will be available at: http://localhost:3000${colors.reset}`);
console.log(`${colors.success}Backend API will be available at: http://localhost:5000/api${colors.reset}`);
