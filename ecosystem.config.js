module.exports = {
  apps: [{
    name: 'hgct',
    script: 'node_modules/.bin/next',
    args: 'start -p 65498',
    cwd: '/root/hgct',
    env: {
      NODE_ENV: 'production',
      PORT: 65498,
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
}
