// Generates the ADMIN_PASSWORD_HASH value for backend/.env.
//
// Usage: node backend/scripts/hash-admin-password.js 'your-chosen-password'

const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node backend/scripts/hash-admin-password.js '<password>'");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log("\nAdd this to backend/.env:\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
});
