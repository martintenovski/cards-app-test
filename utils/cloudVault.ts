import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import {
  bytesToHex,
  bytesToUtf8,
  clean,
  hexToBytes,
  utf8ToBytes,
} from "@noble/ciphers/utils.js";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import type { WalletCard } from "@/types/card";

const CLOUD_VAULT_PREFIX = "cloud-vault-passphrase";
const CLOUD_VAULT_VERSION = 1;
const CLOUD_VAULT_KIND = "pocket-id-encrypted-cards";
const CLOUD_VAULT_SCRYPT_N = 1 << 14;
const CLOUD_VAULT_SCRYPT_R = 8;
const CLOUD_VAULT_SCRYPT_P = 1;
const CLOUD_VAULT_KEY_BYTES = 32;
const CLOUD_VAULT_SALT_BYTES = 16;
const CLOUD_VAULT_NONCE_BYTES = 24;

export const MIN_SYNC_PASSPHRASE_LENGTH = 10;

export type EncryptedWalletCardsPayload = {
  kind: typeof CLOUD_VAULT_KIND;
  version: typeof CLOUD_VAULT_VERSION;
  cipher: "xchacha20poly1305";
  kdf: "scrypt";
  saltHex: string;
  nonceHex: string;
  ciphertextHex: string;
};

function getCloudVaultKey(userId: string) {
  return `${CLOUD_VAULT_PREFIX}-${userId}`;
}

export function validateSyncPassphrase(passphrase: string) {
  if (passphrase.length < MIN_SYNC_PASSPHRASE_LENGTH) {
    throw new Error(
      `Use at least ${MIN_SYNC_PASSPHRASE_LENGTH} characters for your sync passphrase.`,
    );
  }
}

export async function saveStoredSyncPassphrase(
  userId: string,
  passphrase: string,
) {
  validateSyncPassphrase(passphrase);

  await SecureStore.setItemAsync(getCloudVaultKey(userId), passphrase, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getStoredSyncPassphrase(userId: string) {
  return await SecureStore.getItemAsync(getCloudVaultKey(userId));
}

export async function hasStoredSyncPassphrase(userId: string) {
  const passphrase = await getStoredSyncPassphrase(userId);
  return Boolean(passphrase);
}

export async function deleteStoredSyncPassphrase(userId: string) {
  await SecureStore.deleteItemAsync(getCloudVaultKey(userId));
}

export function isEncryptedWalletCardsPayload(
  value: unknown,
): value is EncryptedWalletCardsPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EncryptedWalletCardsPayload>;

  return (
    candidate.kind === CLOUD_VAULT_KIND &&
    candidate.version === CLOUD_VAULT_VERSION &&
    candidate.cipher === "xchacha20poly1305" &&
    candidate.kdf === "scrypt" &&
    typeof candidate.saltHex === "string" &&
    typeof candidate.nonceHex === "string" &&
    typeof candidate.ciphertextHex === "string"
  );
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array) {
  return await scryptAsync(passphrase, salt, {
    N: CLOUD_VAULT_SCRYPT_N,
    r: CLOUD_VAULT_SCRYPT_R,
    p: CLOUD_VAULT_SCRYPT_P,
    dkLen: CLOUD_VAULT_KEY_BYTES,
    asyncTick: 20,
  });
}

export async function encryptWalletCards(
  cards: WalletCard[],
  passphrase: string,
): Promise<EncryptedWalletCardsPayload> {
  validateSyncPassphrase(passphrase);

  const salt = await Crypto.getRandomBytesAsync(CLOUD_VAULT_SALT_BYTES);
  const nonce = await Crypto.getRandomBytesAsync(CLOUD_VAULT_NONCE_BYTES);
  const key = await deriveEncryptionKey(passphrase, salt);
  const plaintext = utf8ToBytes(JSON.stringify(cards));

  try {
    const ciphertext = xchacha20poly1305(key, nonce).encrypt(plaintext);

    return {
      kind: CLOUD_VAULT_KIND,
      version: CLOUD_VAULT_VERSION,
      cipher: "xchacha20poly1305",
      kdf: "scrypt",
      saltHex: bytesToHex(salt),
      nonceHex: bytesToHex(nonce),
      ciphertextHex: bytesToHex(ciphertext),
    };
  } finally {
    clean(key, plaintext);
  }
}

export async function decryptWalletCards(
  payload: EncryptedWalletCardsPayload,
  passphrase: string,
): Promise<WalletCard[]> {
  validateSyncPassphrase(passphrase);

  const salt = hexToBytes(payload.saltHex);
  const nonce = hexToBytes(payload.nonceHex);
  const ciphertext = hexToBytes(payload.ciphertextHex);
  const key = await deriveEncryptionKey(passphrase, salt);

  try {
    const plaintext = xchacha20poly1305(key, nonce).decrypt(ciphertext);

    try {
      const parsed = JSON.parse(bytesToUtf8(plaintext)) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error("Encrypted wallet payload is invalid.");
      }

      return parsed as WalletCard[];
    } finally {
      clean(plaintext);
    }
  } catch {
    throw new Error(
      "Could not decrypt your cloud vault. Check that this device has the correct sync passphrase.",
    );
  } finally {
    clean(key, salt, nonce, ciphertext);
  }
}
