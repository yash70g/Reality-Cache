import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Compute SHA-256 hash of a string (for HTML/text content).
 */
export async function hashString(content) {
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content
    );
    return digest;
}

/**
 * Compute SHA-256 hash from a local file URI.
 * Reads the file as base64 then hashes it.
 */
export async function hashFile(fileUri) {
    const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        content
    );
    return digest;
}
