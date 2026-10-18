import { useState } from "react";
import { ToolDb } from "tool-db";

import ChatApp from "./ChatApp";
import Login from "./Login";

export default function App() {
  const [db, setDb] = useState<ToolDb>();
  return db ? <ChatApp db={db} /> : <Login onLogin={setDb} />;
}
