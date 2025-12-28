import { useCallback, useState } from "react";
import { sha256 } from "tool-db";

import getToolDb from "../utils/getToolDb";
import {
  generateUserEncryptionKeys,
  storeEncryptedKeys,
  loadEncryptedKeys,
  setCurrentKeys,
} from "../utils/encryptionKeyManager";
import { initGroupCrypto } from "../utils/groupCrypto";

interface LoginProps {
  setLoggedIn: (isLoggedIn: boolean) => void;
}

export default function Login(props: LoginProps) {
  const { setLoggedIn } = props;

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const doLogin = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signIn(user, pass).then(async (u) => {
      if (u) {
        // Load ECDH encryption keys (tries local cache first, then network)
        const keys = await loadEncryptedKeys(pass);
        if (keys) {
          setCurrentKeys(keys);
        } else {
          // No keys found locally or on network - this is a legacy account
          // or first time after migration. Generate new keys.
          console.log("No ECDH keys found, generating new ones...");
          const newKeys = await generateUserEncryptionKeys();
          await storeEncryptedKeys(newKeys, pass);
          // Publish our encryption public key
          toolDb.putData("encPubKey", newKeys.publicKey, true);
        }

        // Initialize group crypto with password hash to load/save group keys
        await initGroupCrypto(toolDb, sha256(pass));

        setTimeout(() => {
          toolDb.putData("name", user, true);
          setLoggedIn(true);
        }, 500);
      }
    });
  }, [user, pass]);

  const doSignup = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signUp(user, pass).then(async (u) => {
      console.log(u);
      if (u) {
        // Generate ECDH encryption keys for new user
        const encKeys = await generateUserEncryptionKeys();
        await storeEncryptedKeys(encKeys, pass);

        toolDb.signIn(user, pass).then(async (acc) => {
          if (acc) {
            // Initialize group crypto with password hash
            await initGroupCrypto(toolDb, sha256(pass));

            setTimeout(() => {
              toolDb.putData("name", user, true);
              // Publish our encryption public key to the network
              toolDb.putData("encPubKey", encKeys.publicKey, true);
              setLoggedIn(true);
            }, 500);
          }
        });
      }
    });
  }, [user, pass]);

  return (
    <div className="login">
      <label>User:</label>
      <input onChange={(e) => setUser(e.currentTarget.value)} value={user} />
      <label>Password:</label>
      <input
        onChange={(e) => setPass(e.currentTarget.value)}
        value={pass}
        type="password"
      />
      <button type="button" onClick={doLogin}>
        Login
      </button>
      <button type="button" onClick={doSignup}>
        Signup
      </button>
    </div>
  );
}
