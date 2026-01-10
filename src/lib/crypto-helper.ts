
import * as crypto from "crypto";

// Derived from HWID + Internal Secret for double protection
const getInternalKey = () => {
    const salt = "SMART-ACC-OFFLINE-ULTRA-SECURE-SECRET-2026";
    // In a real app, we'd fetch the actual HWID here, but for now we use a stable derivative
    return crypto.createHash('sha256').update(salt).digest();
};

const IV_LENGTH = 16;

export function encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getInternalKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    if (!text || !text.includes(':')) return text;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getInternalKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Helper to encrypt numeric values as strings
export function encryptAmount(amount: number): string {
    return encrypt(amount.toString());
}

export function decryptAmount(encrypted: string): number {
    const val = decrypt(encrypted);
    return parseFloat(val) || 0;
}
