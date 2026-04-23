module.exports = {
  apps: [
    {
      name: 'oneway-api',
      cwd: '/home/ubuntu/OneWayInterview/server',
      script: 'src/index.js',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/home/ubuntu/OneWayInterview/logs/api-error.log',
      out_file: '/home/ubuntu/OneWayInterview/logs/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
