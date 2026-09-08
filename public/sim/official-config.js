/*
  AVHL Game Simulator V6.2 — prototype administrator gate

  IMPORTANT:
  This is a LOCAL/static prototype. The plaintext password is NOT stored here;
  only a salted SHA-256 digest is stored. Before official league deployment,
  move verification to a server-side endpoint (for example a Vercel API route)
  so browser users cannot bypass the gate by modifying JavaScript.
*/
window.AVHL_OFFICIAL_CONFIG = Object.freeze({
  algorithm: "SHA-256",
  salt: "ad23da69070a639f9c159ddf94474754",
  passwordHash: "f053ee51dde06fe2f0fe076f55b780d4877e204be950662cd3b65e2f4d296192"
});
