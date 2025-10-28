const { spawn } = require('child_process');
const path = require('path');

// تشغيل Backend
const backend = spawn('python', ['main.py'], {
  cwd: path.join(__dirname, '../backend'),
  shell: true,
  stdio: 'inherit'
});

// تشغيل Frontend
const frontend = spawn('pnpm', ['dev'], {
  cwd: path.join(__dirname, '../frontend'),
  shell: true,
  stdio: 'inherit'
});

// معالجة الخروج
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});

backend.on('error', (error) => {
  console.error('Backend error:', error);
});

frontend.on('error', (error) => {
  console.error('Frontend error:', error);
});

