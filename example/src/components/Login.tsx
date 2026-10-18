import { FormEvent, useState } from "react";
import { ToolDb } from "tool-db";

import {
  connectExtension,
  createAccount,
  forgetAccount,
  getSavedAccount,
  hasExtension,
  importAccount,
  unlockAccount,
} from "../identity";

type Mode = "unlock" | "create" | "import";

export default function Login({ onLogin }: { onLogin: (db: ToolDb) => void }) {
  const saved = getSavedAccount();
  const [mode, setMode] = useState<Mode>(saved ? "unlock" : "create");
  const [name, setName] = useState("");
  const [nsec, setNsec] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<ToolDb>) => {
    setBusy(true);
    setError("");
    try {
      onLogin(await action());
    } catch (e: any) {
      setError(e?.message || String(e));
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "unlock") {
      run(() =>
        unlockAccount(password).catch(() => {
          throw new Error("Wrong password");
        })
      );
    } else if (mode === "create") {
      run(() => createAccount(name, password));
    } else {
      run(() => importAccount(nsec.trim(), name, password));
    }
  };

  return (
    <div className="login">
      <h1>ToolDB Chat</h1>
      <p className="muted">
        Encrypted group chat on Nostr. Your key stays in this browser, encrypted
        with your password.
      </p>

      <div className="tabs">
        {saved && (
          <button
            className={mode === "unlock" ? "active" : ""}
            onClick={() => setMode("unlock")}
          >
            Unlock
          </button>
        )}
        <button
          className={mode === "create" ? "active" : ""}
          onClick={() => setMode("create")}
        >
          New account
        </button>
        <button
          className={mode === "import" ? "active" : ""}
          onClick={() => setMode("import")}
        >
          Import key
        </button>
      </div>

      <form onSubmit={submit}>
        {mode === "unlock" && saved && (
          <p>
            Welcome back, <strong>{saved.name}</strong>
          </p>
        )}
        {mode === "import" && (
          <input
            placeholder="Secret key (nsec1...)"
            value={nsec}
            onChange={(e) => setNsec(e.target.value)}
            required
          />
        )}
        {mode !== "unlock" && (
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "unlock" ? "Unlock" : "Continue"}
        </button>
        {mode !== "unlock" && saved && (
          <p className="muted small">
            This replaces the account saved in this browser.
          </p>
        )}
      </form>

      {hasExtension() && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => run(connectExtension)}
        >
          Use my Nostr extension
        </button>
      )}

      {mode === "unlock" && (
        <button
          className="link"
          onClick={() => {
            forgetAccount();
            setMode("create");
          }}
        >
          Forget this account
        </button>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
