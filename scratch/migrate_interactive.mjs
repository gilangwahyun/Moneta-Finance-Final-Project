import { spawn } from 'child_process';

const child = spawn('cmd.exe', ['/c', 'npx prisma migrate dev --name add_notification_log_offline_sync_fields'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
  const str = data.toString();
  console.log(str);
  if (str.toLowerCase().includes('yes/no') || str.toLowerCase().includes('fail') || str.includes('y/N')) {
    child.stdin.write('y\n');
  }
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});
