import crypto from "node:crypto";
const ITERATIONS = 210000;
const DIGEST = "sha256";
const KEY_LENGTH = 32;

const OWNER_CREDENTIALS = Object.freeze({
  "ARI": Object.freeze({ salt: "0102c35d59e45e6bb6213482a6bac9ff", hash: "437b3b1f23bb1a9de1f244ee93a7f0fa4c792c05c7bef0d341af76cf14b83329" }),
  "ATL": Object.freeze({ salt: "34cd8f5185c2f805f9d869663f8080c6", hash: "274c247d9a8626c38f6d9f5b1b6c6037d29ea9a398f204d5e516392706958594" }),
  "BAL": Object.freeze({ salt: "f5b44954256a6a0961ab18eaf7e636da", hash: "b58174d3224d66a59d1920dfb101dbac56f55d5e1cba7dec1b248db03f6a9f62" }),
  "BRO": Object.freeze({ salt: "8b7e426ed1aea28875f43bc2608fc292", hash: "ff5ba905cb3ce92014d8426c02d8c5546771d5b47a6a7ec2b12dac3f3e9e5d46" }),
  "CHA": Object.freeze({ salt: "0c502efd92ab7bffcf38f58f54eabea7", hash: "7357a01b76bfd0899aa11cad27edfa4f10d4769a0853ce632d2cc9452a38dbd4" }),
  "CHI": Object.freeze({ salt: "fb578341a9bafd87c2e52f14137bbdbc", hash: "78d02224084634d01e1fd1287b1dbf36c13a162323fb9f0de47d995d4b672732" }),
  "CIN": Object.freeze({ salt: "31400c6fe24f446a9e66e050635a7661", hash: "42961e8eb7be9fd5311032663477e81b5901bc9d06644340e73bdb59de326e60" }),
  "CLE": Object.freeze({ salt: "b93e09d04b3b3171b7cc59987c2ba8f7", hash: "ee4e72ee2f567ec07852cd5ea5585cb021414a4387281e75c8f083c2c59c2350" }),
  "COL": Object.freeze({ salt: "8de3ec71a6c58d2fcf881b32d4b815a2", hash: "452f14324be1ff15e2a43abedafdeef91a5c8569182808d32f2a50ee5e012fa7" }),
  "DEN": Object.freeze({ salt: "4a6c57c5bd113f8a43dd5176f7bf795c", hash: "db6d782c9908fdf47fa0210ac7ab7d09699474eb951303ec493faaebbfc3da23" }),
  "DET": Object.freeze({ salt: "49afa2326b12bb8cddaa673b0fac7ac9", hash: "4178bbf6de9f9580641d5cf6fdf0e7774ea52e3387fc2cc55131d4be8ab2ab72" }),
  "FLA": Object.freeze({ salt: "b8619a159e7b4dfd15ecb4e3592a5a56", hash: "7ace2d55355bd65c2fd2d62471a7b14b4168a36623fb4724beaa49a5bda63e11" }),
  "FW": Object.freeze({ salt: "e2a452aa036023be4550cd322f4e0395", hash: "db02803cba5ef878d60ef9fea25f3c6e67a7a19b78ddf20746982b7ab9d94439" }),
  "HON": Object.freeze({ salt: "9dd13c76e9c20c82f31478d4e0252e01", hash: "cf8566580b94f32ebd7a09462e555c97fa81e3a0073c4c5079497c1e46229eac" }),
  "HOU": Object.freeze({ salt: "dc950c023d1632ceddb643207505962e", hash: "ff0a0a43b58803f518c55c6601e72c2293e989d6aef3859e7d5a15e549b641ea" }),
  "IND": Object.freeze({ salt: "20faaaeeb24af292b27888fef80230db", hash: "95a9abc0798dcff333b99d896253093625e7e0002f63482de6cb48ba406e75df" }),
  "IOA": Object.freeze({ salt: "45dbfa1e49ce4fa9ecb1c7afead46cbe", hash: "04c912f3121783ba48cc5f276b3948caf46e753b7c965b90af26f789b787ba8d" }),
  "JAX": Object.freeze({ salt: "8dc0ec4af9d24a49afef7d69dc547892", hash: "b8f4a646aecc02117e70ae9ecb5ff2248a38b17381cca40f3345ca55270dc548" }),
  "KC": Object.freeze({ salt: "e08b5520bee06203315bf7d262ec173e", hash: "7700129053a261d0907fded216790e136c2b2e553e265d40cc22b401e0bb724a" }),
  "LI": Object.freeze({ salt: "79ae75e7df9c0510e2aebf2520b61089", hash: "0ddd7c3c13a5affd68efe61cdf02073f5c02162bcfddcaea029a514440556ceb" }),
  "LIN": Object.freeze({ salt: "7f852a2c8fb63907859f62d9f64f99fd", hash: "c8fb29609303af4b05e2d030ad079f51e081e3ee1359792faecdc26946dad398" }),
  "LV": Object.freeze({ salt: "2f101e7edf1370c7d87a877639ab7356", hash: "a0d6d3d1851663ee9922c087e42ec4a99d24aa7641284fe07f158a82e43fdfe8" }),
  "MEM": Object.freeze({ salt: "5f184025a5b8142f9ef3546b386f83db", hash: "59e8f9d010b966d071a9d037d2e19a312af60f7694ca14904922979a3b30ce19" }),
  "MON": Object.freeze({ salt: "56d87cf6616d321c52aedac4b8284947", hash: "fc6ab3be6ee15a9093bfae76685447491b9529c83d2aff9030098dc426b46248" }),
  "ND": Object.freeze({ salt: "f8d5cd814f04445c5d11c7a08f18c623", hash: "c0fa3c55051b2a01038a62dfd16271fa2c27138f863a53d234c43e2b3aad4980" }),
  "NO": Object.freeze({ salt: "fd03a3500d434f4ded04aa8ff05b30e1", hash: "ecc4ea2c1d0a77f0b64706e001432191f8b2df79a6afd9cdc68afce04405102e" }),
  "NVD": Object.freeze({ salt: "61c3e8803c10e656895f8aaf380c1dad", hash: "eb57f6f90f72758e9336230176c5cf91d36834acdf0e9dbd0054a218e7839e59" }),
  "NY": Object.freeze({ salt: "3b4276b10779d82904c65da15bea41a5", hash: "0994a58ef9ecc717de62e44bf9feb7883b4735931c6d0c2e22f197c1d23b73bb" }),
  "OKL": Object.freeze({ salt: "2d0de65c711cc754f59f9b551c8addca", hash: "bdb3ee11bc39583f77aeeefceb8dbabe86b481d2d010b199a1bfab725eff3d4c" }),
  "PHI": Object.freeze({ salt: "c362806bf63b1e8fff7fa1abe3d7a72c", hash: "720ddcf89887a352b133aae0414b3d884db623357b399630c5391c1bb8ac2b14" }),
  "POR": Object.freeze({ salt: "f6317ab6e2569a23298e624269903b15", hash: "c27a19ec18bb7e3cf8bf795b49809c0fb04fe362507f8b4070f37d2aa82c15fc" }),
  "PR": Object.freeze({ salt: "d3ce32d9f1632d015c07e5f6c4bcb659", hash: "21c13344988bb1221052462d606055b3fb4769cfa6d1947b14f4debb382f375e" }),
  "RAL": Object.freeze({ salt: "3f9f52c262ac4239ad3fcc79fb534c48", hash: "93ae56bd4bf375fe8cc28386561c4bcc9eb1f236db7a736f10d61a4206d29c3a" }),
  "RCH": Object.freeze({ salt: "ec819cc10b0179d116e9370a4193b448", hash: "b5eb95379bcc18eaf5335076a4089d1f8cb0f4adb8ff07fd770dd48c5083aef5" }),
  "SAN": Object.freeze({ salt: "3961b1e63489c31b0641addfb6057926", hash: "e0d7241744ec3c997a4e72ee544dc0193fab33f790367543dfc07c4e672b8c08" }),
  "SD": Object.freeze({ salt: "c3c5925f790c386cc0b4d5679dc1343f", hash: "6517a28bea154a02375f249bf0d847987bf7a4f86823670f4144dccfb61830c6" }),
  "SEA": Object.freeze({ salt: "a4e02e509848e39f42ba7a387ad0faf9", hash: "ab8140bfa5a9fefe08643eee198dd19009ee5096467c71df5d11f452238f8f0a" }),
  "STL": Object.freeze({ salt: "43009be23e505cce62499b50dd6114aa", hash: "5548c6582052efcc3c515b643e5ffc70087ddaf81662a8cf8e0960abe3d6c0a9" }),
  "TEN": Object.freeze({ salt: "c996748ba6a18fdcb1f4f5ef011304c3", hash: "cdb625e231207e371a101e0ab7e5b37939b9a2d1a3e9466ebf402356b044f18c" }),
  "WSH": Object.freeze({ salt: "a52955975beb887ca0604099e1a2b3c8", hash: "2523d32f0a66a41d6299e432f1ac19a91634b76774e281058e8cd4d576ec5285" }),
});

const SIM_EXPORT_CREDENTIAL = Object.freeze({ salt: "c555548aee62a471795e9700448dcf92", hash: "423f4997dc454532e3867802bd7bc3cc80796eeb8cffeb9f82a9cf2ee4e0b501" });

function verify(password, credential) {
  if (!credential || typeof password !== "string" || !password) return false;
  const derived = crypto.pbkdf2Sync(password, Buffer.from(credential.salt, "hex"), ITERATIONS, KEY_LENGTH, DIGEST);
  const expected = Buffer.from(credential.hash, "hex");
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export function verifyOwnerPassword(abbreviation, password) {
  return verify(password, OWNER_CREDENTIALS[String(abbreviation || "").toUpperCase()]);
}

export function verifySimExportPassword(password) {
  return verify(password, SIM_EXPORT_CREDENTIAL);
}

export function hasOwnerCredential(abbreviation) {
  return Boolean(OWNER_CREDENTIALS[String(abbreviation || "").toUpperCase()]);
}
