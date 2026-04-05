module.exports = {
  apps: [
    {
      name: 'ant-trail',
      script: 'npx',
      args: 'next start -p 3000 -H 0.0.0.0',
      cwd: '/home/user/webapp/apps/web',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'ant-trail-demo-secret-key-change-in-production',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
}
