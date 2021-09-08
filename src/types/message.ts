export enum VerifyResult {
  InvalidData = -7,
  InvalidVerification = -6,
  InvalidTimestamp = -5,
  PubKeyMismatch = -4,
  NoProofOfWork = -3,
  InvalidHashNonce = -2,
  InvalidSignature = -1,
  Verified = 1,
}
