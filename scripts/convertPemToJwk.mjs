import fs from "fs";

import rsaPemToJwk from "rsa-pem-to-jwk";
import { json } from "stream/consumers";

const privateKey = fs.readFileSync("certs/private.pem");
const jwk = rsaPemToJwk(
  privateKey,
  {
    use: "sig",
  },
  "public",
);

console.log(JSON.stringify(jwk));
