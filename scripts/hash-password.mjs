#!/usr/bin/env node
// Usage: node scripts/hash-password.mjs <plaintext>
// Prints a bcrypt hash to paste into APP_PASSWORD_HASH.
import bcrypt from "bcryptjs";

const pw = process.argv[2];
if (!pw) {
  console.error("Usage: node scripts/hash-password.mjs <plaintext>");
  process.exit(1);
}

const hash = await bcrypt.hash(pw, 12);
console.log(hash);
