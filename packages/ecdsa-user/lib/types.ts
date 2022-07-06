export interface ECDSAUser {
  name: string;
  pub: string;
  priv: string;
}

export interface HexedKeys {
  pub: string;
  priv: string;
}

export interface EncryptedUserdata {
  name: string;
  keys: string;
  iv: string;
}
