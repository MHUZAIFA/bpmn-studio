import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const secret = process.env.XML_ENCRYPTION_SECRET;
  if (!secret) throw new Error('XML_ENCRYPTION_SECRET is not defined');
  return crypto.scryptSync(secret, 'bpmn-salt', KEY_LENGTH);
}

export function encryptXml(plaintext: string): { encryptedXml: string; iv: string } {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encryptedXml: encrypted,
    iv: iv.toString('hex'),
  };
}

export function decryptXml(encryptedXml: string, ivHex: string): string {
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedXml, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
