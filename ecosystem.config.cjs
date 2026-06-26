module.exports = {
  apps: [
    {
      name: "wms-backend",
      script: "server.js",
      cwd: ".",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "wms-frontend",
      script: "./node_modules/vite/bin/vite.js",
      cwd: ".",
      autorestart: true,
      watch: false
    },
    {
      name: "cloudflare-tunnel",
      script: "cloudflared.exe",
      args: "tunnel --url http://localhost:3000",
      cwd: ".",
      interpreter: "none",
      autorestart: true,
      watch: false
    }
  ]
};
