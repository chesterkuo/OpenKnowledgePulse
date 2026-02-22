/**
 * W3C Verifiable Credential signing with Ed25519 for KP-REP reputation system.
 *
 * Implements:
 * - Ed25519 key pair generation
 * - W3C VC creation (unsigned)
 * - Ed25519Signature2020 signing
 * - Signature verification
 */
import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import type { ReputationCredential } from "./types.js";

// Configure @noble/ed25519 sync sha512 from @noble/hashes
ed25519.hashes.sha512 = (msg: Uint8Array): Uint8Array => sha512(msg);

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Generate an Ed25519 key pair for credential signing.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);
  return { publicKey, privateKey };
}

/**
 * Create an unsigned W3C Verifiable Credential for a reputation score.
 */
export function createCredential(opts: {
  issuer: string;
  agentId: string;
  score: number;
  contributions: number;
  validations: number;
  domain?: string;
}): ReputationCredential {
  const credential: ReputationCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://openknowledgepulse.org/credentials/v1",
    ],
    type: ["VerifiableCredential", "KPReputationCredential"],
    issuer: opts.issuer,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: opts.agentId,
      score: opts.score,
      contributions: opts.contributions,
      validations: opts.validations,
    },
  };

  if (opts.domain !== undefined) {
    credential.credentialSubject.domain = opts.domain;
  }

  return credential;
}

/**
 * Produce a canonical JSON form of the credential (excluding the proof field)
 * for signing and verification.
 */
function canonicalize(vc: ReputationCredential): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { proof, ...rest } = vc;
  return JSON.stringify(rest);
}

/**
 * Sign a W3C Verifiable Credential with an Ed25519 private key.
 * Returns a new credential object with the proof attached.
 */
export async function signCredential(
  vc: ReputationCredential,
  privateKey: Uint8Array,
  verificationMethod: string,
): Promise<ReputationCredential> {
  const canonical = canonicalize(vc);
  const message = new TextEncoder().encode(canonical);
  const signature = await ed25519.signAsync(message, privateKey);

  // Base64-encode the signature
  const proofValue = bytesToBase64(signature);

  return {
    ...vc,
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod,
      proofPurpose: "assertionMethod",
      proofValue,
    },
  };
}

/**
 * Verify an Ed25519-signed W3C Verifiable Credential.
 * Returns true if the signature is valid, false otherwise.
 */
export async function verifyCredential(
  vc: ReputationCredential,
  publicKey: Uint8Array,
): Promise<boolean> {
  if (!vc.proof) {
    return false;
  }

  const canonical = canonicalize(vc);
  const message = new TextEncoder().encode(canonical);
  const signature = base64ToBytes(vc.proof.proofValue);

  try {
    return await ed25519.verifyAsync(signature, message, publicKey);
  } catch {
    return false;
  }
}

// --- Base64 helpers ---

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
