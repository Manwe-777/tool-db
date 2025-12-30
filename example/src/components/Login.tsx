import { useCallback, useState, useEffect } from "react";
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

type StatusType = "idle" | "loading" | "error" | "warning" | "success";

interface StatusState {
  type: StatusType;
  message: string;
}

export default function Login(props: LoginProps) {
  const { setLoggedIn } = props;

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState<StatusState>({
    type: "idle",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Listen for username conflict events
  useEffect(() => {
    const toolDb = getToolDb();
    if (!toolDb) return;

    const handleSignupConflict = (data: {
      username: string;
      localTimestamp: number;
      error: string;
    }) => {
      setStatus({
        type: "warning",
        message: `Username conflict detected: ${data.error}`,
      });
    };

    const handleLostUsername = (data: {
      username: string;
      timestamp: number;
      winnerTimestamp: number;
      winnerAddress: string;
    }) => {
      setStatus({
        type: "error",
        message: `Username "${data.username}" was already taken by another user. Please try a different username.`,
      });
      setIsLoading(false);
    };

    toolDb.on("signup-conflict-detected", handleSignupConflict);
    toolDb.on("current-user-lost-username", handleLostUsername);
  }, []);

  const doLogin = useCallback(async () => {
    if (!user.trim() || !pass.trim()) {
      setStatus({
        type: "error",
        message: "Please enter both username and password",
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "loading", message: "Signing in..." });

    try {
      const toolDb = getToolDb();
      const u = await toolDb.signIn(user, pass);

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

        setStatus({ type: "success", message: "Signed in successfully!" });
        setTimeout(() => {
          toolDb.putData("name", user, true);
          setLoggedIn(true);
        }, 500);
      } else {
        setStatus({
          type: "error",
          message: "Sign in failed. Please check your credentials.",
        });
        setIsLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Sign in failed";
      setStatus({ type: "error", message: errorMessage });
      setIsLoading(false);
    }
  }, [user, pass, setLoggedIn]);

  const doSignup = useCallback(async () => {
    if (!user.trim() || !pass.trim()) {
      setStatus({
        type: "error",
        message: "Please enter both username and password",
      });
      return;
    }

    if (user.length < 3) {
      setStatus({
        type: "error",
        message: "Username must be at least 3 characters",
      });
      return;
    }

    if (pass.length < 6) {
      setStatus({
        type: "error",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "loading", message: "Creating account..." });

    try {
      const toolDb = getToolDb();
      const u = await toolDb.signUp(user, pass);
      console.log(u);

      if (u) {
        setStatus({
          type: "loading",
          message: "Account created! Signing in...",
        });

        // Generate ECDH encryption keys for new user
        const encKeys = await generateUserEncryptionKeys();
        await storeEncryptedKeys(encKeys, pass);

        const acc = await toolDb.signIn(user, pass);
        if (acc) {
          // Initialize group crypto with password hash
          await initGroupCrypto(toolDb, sha256(pass));

          setStatus({
            type: "success",
            message: "Welcome! Your account is ready.",
          });
          setTimeout(() => {
            toolDb.putData("name", user, true);
            // Publish our encryption public key to the network
            toolDb.putData("encPubKey", encKeys.publicKey, true);
            setLoggedIn(true);
          }, 500);
        } else {
          setStatus({
            type: "error",
            message:
              "Account created but sign in failed. Please try logging in.",
          });
          setIsLoading(false);
        }
      } else {
        setStatus({
          type: "error",
          message: "Signup failed. Please try again.",
        });
        setIsLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Signup failed";

      // Provide user-friendly error messages
      if (errorMessage.includes("User already exists")) {
        setStatus({
          type: "error",
          message:
            "This username is already taken. Please choose a different one.",
        });
      } else if (errorMessage.includes("conflict")) {
        setStatus({
          type: "warning",
          message:
            "Username conflict detected. Please try a different username.",
        });
      } else {
        setStatus({ type: "error", message: errorMessage });
      }
      setIsLoading(false);
    }
  }, [user, pass, setLoggedIn]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      doLogin();
    }
  };

  return (
    <div className="login">
      <label>User:</label>
      <input
        onChange={(e) => setUser(e.currentTarget.value)}
        value={user}
        disabled={isLoading}
        onKeyDown={handleKeyDown}
        placeholder="Enter username"
      />
      <label>Password:</label>
      <input
        onChange={(e) => setPass(e.currentTarget.value)}
        value={pass}
        type="password"
        disabled={isLoading}
        onKeyDown={handleKeyDown}
        placeholder="Enter password"
      />

      {status.message && (
        <div className={`login-status login-status--${status.type}`}>
          {status.type === "loading" && <span className="loading-spinner" />}
          {status.message}
        </div>
      )}

      <button type="button" onClick={doLogin} disabled={isLoading}>
        {isLoading ? "Please wait..." : "Login"}
      </button>
      <button type="button" onClick={doSignup} disabled={isLoading}>
        Signup
      </button>
    </div>
  );
}
