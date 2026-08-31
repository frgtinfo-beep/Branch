// Creates (or updates the role/name of) a team-portal user account.
//
// Usage (single account):
//   node backend/scripts/seed-team-member.js --name "Jacy Jansen" --email jacy@branch.nu --role teamlid [--password <plain>]
//
// Usage (bootstrap the whole initial roster in one run):
//   node backend/scripts/seed-team-member.js --seed-roster
//
// If --password is omitted, a random one is generated and printed once — it
// is stored only as a bcrypt hash, so save it now or reset it later via the
// Instellingen screen (only Admin can reset a password; staff cannot change
// their own).

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { users } = require("../db");

// Rahel Gibrhiwet is HR — bestuur role, so she can see (read-only) the
// board-only company profile fields on top of normal Teamlid access.
const INITIAL_ROSTER = [
  { name: "Anthony Ilori", email: "anthony@branch.nu", role: "admin" },
  { name: "Aquilla", email: "aquilla@branch.nu", role: "admin" },
  { name: "Rahel Gibrhiwet", email: "rahel@branch.nu", role: "bestuur" },
  { name: "Jacy Jansen", email: "jacy@branch.nu", role: "teamlid" },
  { name: "Tiago Akton", email: "tiago@branch.nu", role: "teamlid" },
  { name: "Pj Malenga", email: "pj@branch.nu", role: "teamlid" },
  { name: "Ties Dekker", email: "ties@branch.nu", role: "teamlid" },
  { name: "Ali Tahir", email: "ali@branch.nu", role: "teamlid" },
  { name: "Faith Osagie", email: "faith@branch.nu", role: "teamlid" },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === "--seed-roster") {
      args["seed-roster"] = true;
      i -= 1; // this flag takes no value, don't consume the next token as one
      continue;
    }
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function generatePassword() {
  return crypto.randomBytes(9).toString("base64url");
}

async function upsertTeamMember({ name, email, role, password }) {
  const usersCol = await users();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await usersCol.findOne({ email: normalizedEmail });

  const plainPassword = password || (existing ? null : generatePassword());
  const update = { name, email: normalizedEmail, role, updatedAt: new Date() };

  if (plainPassword) {
    update.passwordHash = await bcrypt.hash(plainPassword, 12);
  }
  if (!existing) {
    update.active = true;
    update.createdAt = new Date();
    update.lastLoginAt = null;
  }

  await usersCol.updateOne({ email: normalizedEmail }, { $set: update }, { upsert: true });

  console.log(`Team member "${name}" (${normalizedEmail}, ${role}) ${existing ? "updated" : "created"}.`);
  if (plainPassword) {
    console.log(`  Password (save this now — it will not be shown again): ${plainPassword}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args["seed-roster"]) {
    for (const member of INITIAL_ROSTER) {
      await upsertTeamMember(member);
    }
    process.exit(0);
  }

  const name = args["name"];
  const email = args["email"];
  const role = args["role"];
  const password = args["password"];

  if (!name || !email || !role) {
    console.error(
      "Usage: node backend/scripts/seed-team-member.js --name <name> --email <email> --role <admin|teamlid|bestuur> [--password <plain>]\n" +
        "   or: node backend/scripts/seed-team-member.js --seed-roster",
    );
    process.exit(1);
  }
  if (!["admin", "teamlid", "bestuur"].includes(role)) {
    console.error('role must be one of "admin", "teamlid", "bestuur"');
    process.exit(1);
  }

  await upsertTeamMember({ name, email, role, password });
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
