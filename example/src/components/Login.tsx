import { useCallback, useState } from "react";

import getToolDb from "../utils/getToolDb";

interface LoginProps {
  setLoggedIn: (isLoggedIn: boolean) => void;
}

export default function Login(props: LoginProps) {
  const { setLoggedIn } = props;

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const doLogin = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signIn(user, pass).then((u) => {
      if (u) {
        setTimeout(() => {
          toolDb.putData("name", user, true);
          setLoggedIn(true);
        }, 500);
      }
    });
  }, [user, pass]);

  const doSignup = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signUp(user, pass).then((u) => {
      console.log(u);
      if (u) {
        toolDb.signIn(user, pass).then((acc) => {
          if (acc) {
            setTimeout(() => {
              toolDb.putData("name", user, true);
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
