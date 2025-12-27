import { useState } from "react";
import Login from "./Login";

import "./App.css";
import Chat from "./ChatApp";

import WebRtcDebug from "./WebRtcDebug";

function App() {
  const [isLoggedIn, setLoggedIn] = useState(false);

  return (
    <div className="wrapper">
      <WebRtcDebug />
      {isLoggedIn ? <Chat /> : <Login setLoggedIn={setLoggedIn} />}
    </div>
  );
}

export default App;
