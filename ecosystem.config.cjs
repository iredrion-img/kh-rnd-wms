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
    },
    {
      // HANA graph-RAG backend (port 8000) - runs server.py via Python (method A)
      name: "wms-assistant",
      script: "python",
      args: "-m uvicorn server:app --port 8000",
      interpreter: "none",
      cwd: "C:/Users/KH/kh-rnd-wms-hana/system",
      autorestart: true,
      watch: false,
      env: {
        OLLAMA_MODEL: "qwen2.5:7b"
      }
    }
  ]
};
