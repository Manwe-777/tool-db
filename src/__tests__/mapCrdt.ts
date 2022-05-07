import MapCrdt from "../crdt/mapCrdt";

it("Can do t1 and t2", () => {
  const Alice = new MapCrdt<number>("Alice");
  const Bob = new MapCrdt<number>("Bob");

  Alice.SET("dogs", 3);
  Bob.SET("cats", 2);

  Alice.mergeChanges(Bob.getChanges());
  Bob.mergeChanges(Alice.getChanges());

  expect(Alice.value).toEqual({
    cats: 2,
    dogs: 3,
  });
  expect(Bob.value).toEqual({
    cats: 2,
    dogs: 3,
  });
});

it("Can do t1 and t2 with DEL", () => {
  const Alice = new MapCrdt<number>("Alice");
  const Bob = new MapCrdt<number>("Bob");

  Alice.SET("dogs", 3);
  Bob.SET("cats", 10);
  Bob.DEL("dogs");

  Alice.mergeChanges(Bob.getChanges());
  Bob.mergeChanges(Alice.getChanges());

  expect(Alice.value).toEqual({
    cats: 10,
  });
  expect(Bob.value).toEqual({
    cats: 10,
  });
});

it("Can resolve conflic deterministically", () => {
  const Alice = new MapCrdt<string>("Alice");
  const Bob = new MapCrdt<string>("Bob");
  const Chris = new MapCrdt<string>("Chris");

  Chris.SET("name", "im chris");
  Bob.SET("name", "im bob");
  Alice.SET("name", "im alice");

  Bob.mergeChanges(Alice.getChanges());
  Bob.mergeChanges(Chris.getChanges());

  Alice.mergeChanges(Bob.getChanges());
  Alice.mergeChanges(Chris.getChanges());

  Chris.mergeChanges(Alice.getChanges());
  Chris.mergeChanges(Bob.getChanges());

  expect(Alice.value).toEqual({
    name: "im chris",
  });
  expect(Bob.value).toEqual({
    name: "im chris",
  });
  expect(Chris.value).toEqual({
    name: "im chris",
  });
});

it("Can merge from changes", () => {
  const Alice = new MapCrdt<number>("Alice");

  Alice.SET("dogs", 3);

  const Bob = new MapCrdt<number>("Bob", Alice.getChanges());
  Bob.SET("cats", 10);
  Bob.DEL("dogs");

  Alice.mergeChanges(Bob.getChanges());

  expect(Alice.value).toEqual({
    cats: 10,
  });
  expect(Bob.value).toEqual({
    cats: 10,
  });
});

it("Can merge equal and repeated changes", () => {
  const Alice = new MapCrdt<number>("Alice");
  const Bob = new MapCrdt<number>("Bob");

  Alice.SET("dogs", 3);

  Bob.mergeChanges(Alice.getChanges());
  Alice.mergeChanges(Bob.getChanges());

  Bob.SET("cats", 10);
  Bob.DEL("dogs");

  Alice.mergeChanges(Bob.getChanges());

  Alice.SET("zebras", 3);

  Bob.mergeChanges(Alice.getChanges());
  Bob.DEL("zebras");

  Alice.mergeChanges(Bob.getChanges());
  Bob.mergeChanges(Alice.getChanges());

  expect(Alice.value).toEqual({
    cats: 10,
  });
  expect(Bob.value).toEqual({
    cats: 10,
  });
});

it("Can merge with past indexes", () => {
  const Alice = new MapCrdt<number>("Alice");
  const Bob = new MapCrdt<number>("Bob");

  Alice.SET("dogs", 1);
  Alice.SET("dogs", 3);
  Alice.SET("dogs", 5);

  Bob.mergeChanges(Alice.getChanges());

  Bob.DEL("dogs");

  Alice.mergeChanges(Bob.getChanges());

  expect(Alice.value).toEqual({});
  expect(Bob.value).toEqual({});
});

it("Can solve concurrent oposing types", () => {
  const Alice = new MapCrdt<number>("Alice");
  const Bob = new MapCrdt<number>("Bob");

  Bob.DEL("cats");
  Alice.SET("cats", 8);

  Bob.mergeChanges(Alice.getChanges());
  Alice.mergeChanges(Bob.getChanges());

  expect(Alice.value).toEqual({});
  expect(Bob.value).toEqual({});
});
