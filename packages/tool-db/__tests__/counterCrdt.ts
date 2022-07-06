import { CounterCrdt } from "..";

it("Can add separately", () => {
  const Alice = new CounterCrdt("Alice");
  const Bob = new CounterCrdt("Bob");

  Alice.ADD(5);

  expect(Alice.value).toEqual(5);

  Bob.mergeChanges(Alice.getChanges());

  Alice.ADD(4);
  Bob.ADD(3);

  // Out of sync!
  expect(Alice.value).toEqual(9);
  expect(Bob.value).toEqual(8);

  // Merge
  Bob.mergeChanges(Alice.getChanges());
  Alice.mergeChanges(Bob.getChanges());

  // Ok!
  expect(Alice.value).toEqual(12);
  expect(Bob.value).toEqual(12);
});

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

it("Can merge shuffled changes", () => {
  const Alice = new CounterCrdt("Alice");
  const Bob = new CounterCrdt("Bob");

  Alice.ADD(5);

  expect(Alice.value).toEqual(5);

  Bob.mergeChanges(Alice.getChanges());

  Alice.ADD(4);
  Bob.ADD(3);

  // Out of sync!
  expect(Alice.value).toEqual(9);
  expect(Bob.value).toEqual(8);

  // Merge
  Bob.mergeChanges(Alice.getChanges());
  Alice.mergeChanges(Bob.getChanges());

  const changes = Alice.getChanges();
  shuffleArray(changes);

  const Chris = new CounterCrdt("Chris", changes);
  expect(Chris.value).toEqual(12);
});

it("Can do subtraction", () => {
  const Alice = new CounterCrdt("Alice");
  const Bob = new CounterCrdt("Bob");

  Alice.ADD(3);

  Alice.mergeChanges(Bob.getChanges());
  Bob.mergeChanges(Alice.getChanges());

  Bob.SUB(2);

  Alice.mergeChanges(Bob.getChanges());

  expect(Alice.value).toEqual(1);
  expect(Bob.value).toEqual(1);
});

it("Can handle more than two players", () => {
  const Alice = new CounterCrdt("Alice");
  const Bob = new CounterCrdt("Bob");
  const Chris = new CounterCrdt("Chris");

  Alice.ADD(3);
  Bob.mergeChanges(Alice.getChanges());

  Bob.SUB(2);
  Alice.mergeChanges(Bob.getChanges());

  expect(Alice.value).toEqual(1);
  expect(Bob.value).toEqual(1);

  Chris.ADD(10);
  Chris.mergeChanges(Alice.getChanges());

  expect(Chris.value).toEqual(11);

  Alice.mergeChanges(Chris.getChanges());
  Bob.mergeChanges(Chris.getChanges());
  expect(Alice.value).toEqual(11);
  expect(Bob.value).toEqual(11);

  const Donna = new CounterCrdt("Donna", Alice.getChanges());
  expect(Donna.value).toEqual(11);
});
