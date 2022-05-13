import ListCrdt from "../crdt/listCrdt";

it("Can do continnuous test", () => {
  const Alice = new ListCrdt<string>("Alice");
  const Bob = new ListCrdt<string>("Bob");

  Alice.PUSH("c");
  Alice.PUSH("o");
  Alice.PUSH("n");
  Alice.PUSH("t");
  Alice.PUSH("i");
  Alice.PUSH("n");
  Alice.PUSH("o");
  Alice.PUSH("u");
  Alice.PUSH("s");

  Bob.mergeChanges(Alice.getChanges());

  expect(Alice.value.join("")).toEqual("continous");
  expect(Bob.value.join("")).toEqual("continous");

  Alice.INS("u", 6);
  Bob.INS("n", 6);

  expect(Alice.value.join("")).toEqual("continuous");
  expect(Bob.value.join("")).toEqual("continnous");

  Alice.mergeChanges(Bob.getChanges());
  Bob.mergeChanges(Alice.getChanges());

  expect(Alice.value.join("")).toEqual("continnuous");
  expect(Bob.value.join("")).toEqual("continnuous");
});

it("Can delete and still achieve consensus", () => {
  const Alice = new ListCrdt<string>("Alice");
  const Bob = new ListCrdt<string>("Bob");

  Alice.PUSH("m");
  Alice.PUSH("i");
  Alice.PUSH("n");
  Alice.PUSH("s");
  Alice.PUSH("k");

  Bob.mergeChanges(Alice.getChanges());

  expect(Alice.value.join("")).toEqual("minsk");
  expect(Bob.value.join("")).toEqual("minsk");

  Bob.DEL(0);

  expect(Bob.value.join("")).toEqual("insk");

  Bob.INS("p", 0);

  expect(Bob.value.join("")).toEqual("pinsk");

  Bob.DEL(3);

  expect(Bob.value.join("")).toEqual("pink");

  Alice.mergeChanges(Bob.getChanges());
  Bob.mergeChanges(Alice.getChanges());

  expect(Alice.value.join("")).toEqual("pink");
});

it("Can insert at 0", () => {
  const Alice = new ListCrdt<string>("Alice");

  Alice.INS("m", 0);
  Alice.PUSH("i");
  Alice.PUSH("n");
  Alice.PUSH("s");
  Alice.PUSH("k");

  expect(Alice.value.join("")).toEqual("minsk");

  Alice.INS("a", 0);

  expect(Alice.value.join("")).toEqual("aminsk");

  const Bob = new ListCrdt<string>("Bob", Alice.getChanges());

  expect(Bob.value.join("")).toEqual("aminsk");
});
