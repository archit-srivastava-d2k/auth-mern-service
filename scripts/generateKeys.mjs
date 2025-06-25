import crypto from 'crypto';
import fs from 'fs';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});


fs.writeFileSync('certs/public.pem', publicKey);
fs.writeFileSync('certs/private.pem', privateKey);
console.log('Keys generated and saved to certs/public.pem and certs/private.pem');
console.log('Public Key:', publicKey);
console.log('Private Key:', privateKey);

  