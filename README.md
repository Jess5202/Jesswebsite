# Jess JB Property 绝世好屋

Live website: https://jessjbproperty.my

Property manager: https://jess-jb-property.helpfulbagel1.chatgpt.site/admin

This repository backs up the website source. The live site runs on ChatGPT Sites with a Cloudflare Worker and persistent object storage. GitHub Pages cannot run the property manager, image uploads, or authenticated API. Pushing to this repository does not automatically publish to Sites.

Build: `node scripts/build.mjs`

Checks: `node scripts/validate-artifact.mjs`, `node tests/worker.test.mjs`, `node tests/property-filters.test.mjs`, `node tests/copy-parser.test.mjs`.

Live property records and uploaded photos are stored separately in the existing Sites storage and are not a part of this source backup. Do not replace that catalog with web/seed.json. Owner authentication depends on trusted Sites identity headers and must be replaced before moving the backend to another host.
