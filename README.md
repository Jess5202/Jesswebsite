# Jess JB Property 绝世好屋

Live website: https://jessjbproperty.my

Admin: https://jess-jb-property.helpfulbagel1.chatgpt.site/admin

This public repository is a source backup. Production is hosted on ChatGPT Sites using a Cloudflare Worker and persistent object storage. GitHub Pages cannot run the property-management backend. Pushing to GitHub does not automatically deploy to Sites.

Build: `node scripts/build.mjs`

Validate: `node scripts/validate-artifact.mjs`

Tests: `node tests/worker.test.mjs`, `node tests/property-filters.test.mjs`, `node tests/copy-parser.test.mjs`.

Live inventory and uploaded photos remain in Sites storage and are not backed up here. Never replace the live catalog with web/seed.json. Owner authentication relies on trusted Sites identity headers; it must be replaced before moving the backend to another host.
