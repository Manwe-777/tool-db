"use client";

import { useState, useEffect } from "react";
import type ToolDb from "tooldb";
import type { CounterCrdt, ListCrdt, MapCrdt } from "tooldb";

export default function Home() {
  const [db, setDb] = useState<ToolDb.ToolDb | null>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  // Counter state
  const [counter, setCounter] = useState<CounterCrdt<number> | null>(null);
  const [counterValue, setCounterValue] = useState(0);

  // List state
  const [todoList, setTodoList] = useState<ListCrdt<string> | null>(null);
  const [todoItems, setTodoItems] = useState<string[]>([]);
  const [newTodo, setNewTodo] = useState("");

  // Map state
  const [kvMap, setKvMap] = useState<MapCrdt<string> | null>(null);
  const [kvPairs, setKvPairs] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    async function connectToDb() {
      try {
        const [
          { ToolDb, CounterCrdt, ListCrdt, MapCrdt },
          { default: WebrtcNetwork },
          { default: EcdsaUser },
          { default: IndexedDbStore }
        ] = await Promise.all([
          import("tooldb"),
          import("webrtc-network"),
          import("ecdsa-user"),
          import("indexeddb-store")
        ]);

        const toolDb = new ToolDb({
          networkAdapter: WebrtcNetwork,
          userAdapter: EcdsaUser,
          storageAdapter: IndexedDbStore,
          debug: true,
        });
        (window as any).toolDb = toolDb;

        console.log("Demo: ToolDb created, attaching init listener");

        // Wait for peerAccount initialization
        toolDb.once("init", async () => {
          console.log("Demo: init event received!");
          setStatus("Initializing...");
          
          // Sign in anonymously (don't wait for peer connections)
          await toolDb.anonSignIn();
          const address = toolDb.userAccount.getAddress();
          const username = toolDb.userAccount.getUsername();
          console.log("address", address);
          console.log("username", username);
          
          if (address) setUserAddress(address);
          if (username) setUsername(username);

          // Initialize CRDTs
          const counterCrdt = new CounterCrdt<number>(address || "anonymous");
          const listCrdt = new ListCrdt<string>(address || "anonymous");
          const mapCrdt = new MapCrdt<string>(address || "anonymous");

          setCounter(counterCrdt);
          setTodoList(listCrdt);
          setKvMap(mapCrdt);

          // Set up listeners for real-time updates
          toolDb.addKeyListener("demo-counter", (msg) => {
            if (msg.v && Array.isArray(msg.v)) {
              counterCrdt.mergeChanges(msg.v);
              setCounterValue(counterCrdt.value);
            }
          });

          toolDb.addKeyListener("demo-todos", (msg) => {
            if (msg.v && Array.isArray(msg.v)) {
              listCrdt.mergeChanges(msg.v);
              setTodoItems([...(listCrdt.value as string[])]);
            }
          });

          toolDb.addKeyListener("demo-kvmap", (msg) => {
            if (msg.v && Array.isArray(msg.v)) {
              mapCrdt.mergeChanges(msg.v);
              setKvPairs({...(mapCrdt.value as Record<string, string>)});
            }
          });

          // Load existing data from local storage
          await toolDb.getCrdt("demo-counter", counterCrdt);
          await toolDb.getCrdt("demo-todos", listCrdt);
          await toolDb.getCrdt("demo-kvmap", mapCrdt);

          setCounterValue(counterCrdt.value);
          setTodoItems([...(listCrdt.value as string[])]);
          setKvPairs({...(mapCrdt.value as Record<string, string>)});

          setDb(toolDb);
          setStatus("Ready (looking for peers...)");
        });

        toolDb.onConnect = () => {
          console.log("Demo: onConnect fired!");
          setIsConnected(true);
          setStatus("Connected to peers");
          
          // Subscribe to CRDT updates when connected
          toolDb.subscribeData("demo-counter");
          toolDb.subscribeData("demo-todos");
          toolDb.subscribeData("demo-kvmap");
        };

        toolDb.onDisconnect = () => {
          console.log("Demo: onDisconnect fired!");
          setIsConnected(false);
          setStatus("Ready (no peers connected)");
        };
      } catch (error) {
        setStatus("Connection failed: " + (error as Error).message);
      }
    }

    connectToDb();
  }, []);

  const handleCounterAdd = async (value: number) => {
    if (!counter || !db) return;
    
    counter.ADD(value);
    setCounterValue(counter.value);
    await db.putCrdt("demo-counter", counter);
  };

  const handleCounterSub = async (value: number) => {
    if (!counter || !db) return;
    
    counter.SUB(value);
    setCounterValue(counter.value);
    await db.putCrdt("demo-counter", counter);
  };

  const handleAddTodo = async () => {
    if (!todoList || !db || !newTodo.trim()) return;
    
    todoList.PUSH(newTodo.trim());
    setTodoItems([...(todoList.value as string[])]);
    setNewTodo("");
    await db.putCrdt("demo-todos", todoList);
  };

  const handleDeleteTodo = async (index: number) => {
    if (!todoList || !db) return;
    
    todoList.DEL(index);
    setTodoItems([...(todoList.value as string[])]);
    await db.putCrdt("demo-todos", todoList);
  };

  const handleAddKVPair = async () => {
    if (!kvMap || !db || !newKey.trim() || !newValue.trim()) return;
    
    kvMap.SET(newKey.trim(), newValue.trim());
    setKvPairs({...(kvMap.value as Record<string, string>)});
    setNewKey("");
    setNewValue("");
    await db.putCrdt("demo-kvmap", kvMap);
  };

  const handleDeleteKVPair = async (key: string) => {
    if (!kvMap || !db) return;
    
    kvMap.DEL(key);
    setKvPairs({...(kvMap.value as Record<string, string>)});
    await db.putCrdt("demo-kvmap", kvMap);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ToolDb Collaborative Demo
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Real-time collaborative CRDTs powered by ToolDb
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className={`px-3 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {status}
            </div>
            {userAddress && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                {username} ({userAddress.slice(0, 8)}...)
              </div>
            )}
          </div>
        </div>

        {/* CRDT Demos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Counter CRDT */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Collaborative Counter
            </h2>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-blue-600 mb-4">
                {counterValue}
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleCounterSub(1)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  -1
                </button>
                <button
                  onClick={() => handleCounterSub(5)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  -5
                </button>
                <button
                  onClick={() => handleCounterAdd(1)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  +1
                </button>
                <button
                  onClick={() => handleCounterAdd(5)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  +5
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Try opening multiple tabs to see real-time synchronization!
            </p>
          </div>

          {/* List CRDT */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Collaborative Todo List
            </h2>
            <div className="mb-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Add a todo..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                />
                <button
                  onClick={handleAddTodo}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {todoItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{item}</span>
                    <button
                      onClick={() => handleDeleteTodo(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {todoItems.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No todos yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Map CRDT */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              Collaborative Key-Value Store
            </h2>
            <div className="mb-4">
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddKVPair}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Add Pair
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(kvPairs).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="text-sm">
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                    <button
                      onClick={() => handleDeleteKVPair(key)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {Object.keys(kvPairs).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No key-value pairs yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
