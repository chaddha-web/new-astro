
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import LZString from 'lz-string';

// Secret key for client-side encryption (data privacy)
const ENCRYPTION_SECRET = "ASTRO_VASTU_SECURE_KEY_9988";

// JWT Secret: Prioritize environment variable, fallback to internal key for dev
const JWT_SECRET = process.env.JWT_SECRET || "ASTRO_COSMIC_jwt_SECRET_7DAYS_KEY";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const compressAndEncrypt = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_SECRET).toString();
    const compressed = LZString.compressToUTF16(encrypted);
    return compressed;
  } catch (e) {
    console.error("Encryption failed", e);
    return "";
  }
};

export const decryptAndDecompress = (compressedString: string): any => {
  try {
    if (!compressedString) return null;
    const encrypted = LZString.decompressFromUTF16(compressedString);
    if (!encrypted) return null;
    
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};

// --- JWT IMPLEMENTATION ---

const base64UrlEncode = (wordArray: CryptoJS.lib.WordArray): string => {
    let encoded = CryptoJS.enc.Base64.stringify(wordArray);
    encoded = encoded.replace(/=+$/, '');
    encoded = encoded.replace(/\+/g, '-');
    encoded = encoded.replace(/\//g, '_');
    return encoded;
}

const base64UrlDecode = (str: string): string => {
    let output = str.replace(/-/g, "+").replace(/_/g, "/");
    switch (output.length % 4) {
        case 0: break;
        case 2: output += "=="; break;
        case 3: output += "="; break;
        default: throw "Illegal base64url string!";
    }
    return CryptoJS.enc.Base64.parse(output).toString(CryptoJS.enc.Utf8);
}

export const generateJWT = (contact: string): string => {
    try {
        const header = { alg: "HS256", typ: "JWT" };
        const now = Date.now();
        const expiry = now + (7 * 24 * 60 * 60 * 1000); // 7 Days validity
        const payload = { sub: contact, iat: now, exp: expiry };

        const stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
        const encodedHeader = base64UrlEncode(stringifiedHeader);

        const stringifiedPayload = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
        const encodedPayload = base64UrlEncode(stringifiedPayload);

        const signature = CryptoJS.HmacSHA256(encodedHeader + "." + encodedPayload, JWT_SECRET);
        const encodedSignature = base64UrlEncode(signature);

        return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    } catch (e) {
        console.error("Error generating JWT", e);
        return "";
    }
};

export const verifyJWT = (token: string): string | null => {
    try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;

        const testSignature = CryptoJS.HmacSHA256(header + "." + payload, JWT_SECRET);
        const encodedTestSignature = base64UrlEncode(testSignature);

        if (encodedTestSignature !== signature) {
            console.warn("JWT Signature mismatch");
            return null;
        }

        const decodedPayload = JSON.parse(base64UrlDecode(payload));
        
        // Check Expiry
        if (Date.now() > decodedPayload.exp) {
            console.warn("JWT Token Expired");
            return null;
        }

        return decodedPayload.sub; // Returns the contact (subject)
    } catch (e) {
        console.error("JWT Verification Error", e);
        return null;
    }
};
