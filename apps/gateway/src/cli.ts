import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PlatformAuthService } from './modules/platform-auth/platform-auth.service';
import * as readline from 'readline';

function askHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    process.stdout.write(query);

    const onData = (char: any) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          break;
        default:
          process.stdout.write('\x1B[2K\x1B[200D' + query + '*'.repeat(rl.line.length));
          break;
      }
    };

    stdin.on('data', onData);

    rl.question('', (value) => {
      stdin.removeListener('data', onData);
      rl.close();
      console.log('');
      resolve(value.trim());
    });
  });
}

function ask(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function run() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`
WAgyuu Gateway IT Management CLI
=================================
Perintah yang tersedia:
  bootstrap-superadmin    Inisialisasi akun Superadmin pertama secara aman melalui prompt interaktif atau argumen CLI.
                          Opsi non-interaktif:
                            --username <user>
                            --email <email>
                            --name <full_name>
                            --password <pass>
  help                    Menampilkan bantuan ini.

Contoh:
  node dist/cli.js bootstrap-superadmin
  node dist/cli.js bootstrap-superadmin --username admin --email admin@example.com --name "Super Admin" --password "StrongPass123!"
    `);
    process.exit(0);
  }

  if (command === 'bootstrap-superadmin') {
    console.log('\n--- PROVISIONING SUPERADMIN AWAL WAGYUU ---');
    console.log('Perintah ini menginisialisasi superadmin pertama di server.');

    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const authService = app.get(PlatformAuthService);

    try {
      const existingCount = await authService.countSuperadmins();
      if (existingCount > 0) {
        console.error('\n❌ ERROR: Superadmin sudah terdaftar di sistem.');
        console.error('Gunakan alur administrasi portal untuk mengelola pengguna IT.');
        await app.close();
        process.exit(1);
      }

      let username = getArg('--username') || process.env.WAGYUU_ADMIN_USER;
      let email = getArg('--email') || process.env.WAGYUU_ADMIN_EMAIL;
      let fullName = getArg('--name') || process.env.WAGYUU_ADMIN_NAME;
      let password = getArg('--password') || process.env.WAGYUU_ADMIN_PASS;

      if (!username) {
        username = await ask('Masukkan nama pengguna (username): ');
      }
      if (!username || username.length < 3) {
        console.error('❌ Username minimal 3 karakter.');
        await app.close();
        process.exit(1);
      }

      if (!email) {
        email = await ask('Masukkan email: ');
      }
      if (!email || !email.includes('@')) {
        console.error('❌ Format email tidak valid.');
        await app.close();
        process.exit(1);
      }

      if (!fullName) {
        fullName = await ask('Masukkan nama lengkap: ');
      }
      if (!fullName) {
        console.error('❌ Nama lengkap wajib diisi.');
        await app.close();
        process.exit(1);
      }

      if (!password) {
        password = await askHidden('Masukkan kata sandi (min. 10 karakter, tersembunyi): ');
        if (!password || password.length < 10) {
          console.error('❌ Kata sandi minimal 10 karakter.');
          await app.close();
          process.exit(1);
        }

        const confirmPassword = await askHidden('Ulangi kata sandi: ');
        if (password !== confirmPassword) {
          console.error('❌ Konfirmasi kata sandi tidak cocok.');
          await app.close();
          process.exit(1);
        }
      } else if (password.length < 10) {
        console.error('❌ Kata sandi minimal 10 karakter.');
        await app.close();
        process.exit(1);
      }

      const user = await authService.bootstrapSuperadmin({
        username,
        email,
        fullName,
        password,
      });

      console.log('\n✅ BERHASIL: Superadmin pertama telah dibuat!');
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      console.log('Anda sekarang dapat login melalui /admin/login pada browser.');

      await app.close();
      process.exit(0);
    } catch (err: any) {
      console.error(`\n❌ Gagal membuat superadmin: ${err.message}`);
      await app.close();
      process.exit(1);
    }
  }

  console.error(`Perintah tidak dikenal: ${command}. Jalankan dengan 'help' untuk daftar perintah.`);
  process.exit(1);
}

run();
