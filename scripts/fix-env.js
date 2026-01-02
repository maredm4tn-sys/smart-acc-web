const fs = require('fs');
const content = `DATABASE_URL="postgresql://neondb_owner:npg_OkqSuil20Xpy@ep-late-heart-ag21qr8g-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"`;
fs.writeFileSync('.env', content, { encoding: 'utf8' });
console.log("Wrote .env in UTF-8");
