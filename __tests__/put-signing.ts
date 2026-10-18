import { MapCrdt, ToolDb, ToolDbUserAdapter } from "../packages/tool-db";

// A user adapter that is logged in but fails to sign (the base adapter
// rejects signEvent), like a signer the user declined
class NoSignatureUser extends ToolDbUserAdapter {
  public getAddress() {
    return "no-signature-address";
  }
}

const settlesWithin = (promise: Promise<unknown>, ms: number) =>
  Promise.race([
    promise.then(
      () => "resolved",
      () => "rejected"
    ),
    new Promise((resolve) => setTimeout(() => resolve("pending"), ms)),
  ]);

it("Rejects a PUT when the data can not be signed", async () => {
  const db = new ToolDb({ userAdapter: NoSignatureUser });

  expect(await settlesWithin(db.putData("key", "value"), 1000)).toBe(
    "rejected"
  );
});

it("Rejects a CRDT PUT when the data can not be signed", async () => {
  const db = new ToolDb({ userAdapter: NoSignatureUser });
  const crdt = new MapCrdt<string>("no-signature-address");
  crdt.SET("key", "value");

  expect(await settlesWithin(db.putCrdt("key", crdt), 1000)).toBe("rejected");
});
