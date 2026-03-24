module.exports = {
  apps: [{
    name: 'process-submissions',
    script: './src/cli.js',
    args: ['process-submissions'],
    watch: true,
    cron_restart: '*/3 * * * *',
    autorestart: false,
    exec_mode: 'fork',
    instances: 1,
  }]
}
