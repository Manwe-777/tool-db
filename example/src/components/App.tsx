import { useState } from "react";
import Login from "./Login";

import "./App.css";
import Chat from "./ChatApp";

import WebRtcDebug from "./WebRtcDebug";

function App() {
  const [isLoggedIn, setLoggedIn] = useState(false);

  return (
    <div className="wrapper">
      {isLoggedIn ? (
        <Chat />
      ) : (
        <>
          <div className="left-column login-debug">
            <WebRtcDebug />
          </div>
          <Login setLoggedIn={setLoggedIn} />
        </>
      )}
    </div>
  );
}

export default App;
