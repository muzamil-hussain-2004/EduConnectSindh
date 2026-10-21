---
title: EduConnect Sindh API
emoji: 🎓
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

Express + TypeScript API for EduConnect Sindh. The Dockerfile clones the public GitHub repo,
builds the backend, applies database migrations and starts the server on port 7860.
Configuration comes from the Space **Secrets** (see docs/DEPLOYMENT.md in the repo).
