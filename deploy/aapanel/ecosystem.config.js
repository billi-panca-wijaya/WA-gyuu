module.exports = {
  apps: [
    {
      name: 'wagyuu-gateway',
      script: 'dist/main.js',
      cwd: '/www/wwwroot/wa-api.billi-panca-wijaya.my.id/apps/gateway',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 18091,
        DATABASE_PATH: '/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data/wagyuu.sqlite',
        WAGYUU_SESSIONS_PATH: '/www/wwwroot/wa-api.billi-panca-wijaya.my.id/data/sessions',
      },
    },
  ],
};
