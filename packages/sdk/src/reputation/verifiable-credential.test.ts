import { describe, expect, it } from "bun:test";
import {
  createCredential,
  generateKeyPair,
  signCredential,
  verifyCredential,
} from "./verifiable-credential.js";

describe("verifiable-credential", () => {
  describe("generateKeyPair", () => {
    it("returns 32-byte Ed25519 keys", async () => {
      const kp = await generateKeyPair();
      expect(kp.privateKey).toBeInstanceOf(Uint8Array);
      expect(kp.publicKey).toBeInstanceOf(Uint8Array);
      expect(kp.privateKey.length).toBe(32);
      expect(kp.publicKey.length).toBe(32);
    });
  });

  describe("createCredential", () => {
    it("returns valid W3C VC structure", () => {
      const vc = createCredential({
        issuer: "did:kp:registry-001",
        agentId: "did:kp:agent-abc",
        score: 0.85,
        contributions: 42,
        validations: 18,
        domain: "typescript",
      });

      expect(vc["@context"]).toEqual([
        "https://www.w3.org/2018/credentials/v1",
        "https://openknowledgepulse.org/credentials/v1",
      ]);
      expect(vc.type).toEqual(["VerifiableCredential", "KPReputationCredential"]);
      expect(vc.issuer).toBe("did:kp:registry-001");
      expect(vc.issuanceDate).toBeTruthy();
      expect(vc.credentialSubject.id).toBe("did:kp:agent-abc");
      expect(vc.credentialSubject.score).toBe(0.85);
      expect(vc.credentialSubject.contributions).toBe(42);
      expect(vc.credentialSubject.validations).toBe(18);
      expect(vc.credentialSubject.domain).toBe("typescript");
      expect(vc.proof).toBeUndefined();
    });

    it("omits domain when not provided", () => {
      const vc = createCredential({
        issuer: "did:kp:registry-001",
        agentId: "did:kp:agent-abc",
        score: 0.5,
        contributions: 10,
        validations: 5,
      });

      expect(vc.credentialSubject.domain).toBeUndefined();
    });
  });

  describe("signCredential", () => {
    it("adds Ed25519Signature2020 proof with proofValue", async () => {
      const kp = await generateKeyPair();
      const vc = createCredential({
        issuer: "did:kp:registry-001",
        agentId: "did:kp:agent-abc",
        score: 0.9,
        contributions: 50,
        validations: 30,
      });

      const signed = await signCredential(vc, kp.privateKey, "did:kp:registry-001#key-1");

      expect(signed.proof).toBeDefined();
      expect(signed.proof!.type).toBe("Ed25519Signature2020");
      expect(signed.proof!.proofPurpose).toBe("assertionMethod");
      expect(signed.proof!.verificationMethod).toBe("did:kp:registry-001#key-1");
      expect(signed.proof!.created).toBeTruthy();
      expect(signed.proof!.proofValue).toBeTruthy();
      // proofValue should be a base64-encoded 64-byte Ed25519 signature
      expect(typeof signed.proof!.proofValue).toBe("string");
      expect(signed.proof!.proofValue.length).toBeGreaterThan(0);
    });
  });

  describe("verifyCredential", () => {
    it("succeeds for valid signature", async () => {
      const kp = await generateKeyPair();
      const vc = createCredential({
        issuer: "did:kp:registry-001",
        agentId: "did:kp:agent-abc",
        score: 0.75,
        contributions: 20,
        validations: 10,
      });

      const signed = await signCredential(vc, kp.privateKey, "did:kp:registry-001#key-1");

      const valid = await verifyCredential(signed, kp.publicKey);
      expect(valid).toBe(true);
    });

    it("fails for tampered credential (modified score)", async () => {
      const kp = await generateKeyPair();
      const vc = createCredential({
        issuer: "did:kp:registry-001",
        agentId: "did:kp:agent-abc",
        score: 0.75,
        contributions: 20,
        validations: 10,
      });

      const signed = await signCredential(vc, kp.privateKey, "did:kp:registry-001#key-1");

      // Tamper with the score after signing
      const tampered = {
        ...signed,
        credentialSubject: {
          ...signed.credentialSubject,
          score: 0.99,
        },
      };

      const valid = await verifyCredential(tampered, kp.publicKey);
      expect(valid).toBe(false);
    });

    it("fails when proof is missing", async () => {
      const kp = await generateKeyPair();
      const vc = createCredential({
        issuer: "did:kp:registry-001",
        agentId: "did:kp:agent-abc",
        score: 0.5,
        contributions: 5,
        validations: 2,
      });

      const valid = await verifyCredential(vc, kp.publicKey);
      expect(valid).toBe(false);
    });

    it("fails with wrong public key", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const vc = createCredential({
        issuer: "did:kp:registry-001",
        agentId: "did:kp:agent-abc",
        score: 0.75,
        contributions: 20,
        validations: 10,
      });

      const signed = await signCredential(vc, kp1.privateKey, "did:kp:registry-001#key-1");

      // Verify with a different public key
      const valid = await verifyCredential(signed, kp2.publicKey);
      expect(valid).toBe(false);
    });
  });
});
