import { CounterCrdt } from "../packages/tool-db";

describe("CounterCrdt - Additional Edge Cases", () => {
  it("Can handle ADD with zero", () => {
    const Alice = new CounterCrdt("Alice");

    Alice.ADD(0);

    expect(Alice.value).toEqual(0);

    Alice.ADD(5);

    expect(Alice.value).toEqual(5);
  });

  it("Can handle SUB with zero", () => {
    const Alice = new CounterCrdt("Alice");

    Alice.ADD(10);
    Alice.SUB(0);

    expect(Alice.value).toEqual(10);
  });

  it("Can handle going negative", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    Alice.ADD(5);
    Bob.mergeChanges(Alice.getChanges());

    Alice.SUB(10);
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual(-5);
    expect(Bob.value).toEqual(-5);
  });

  it("Can handle large numbers", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    Alice.ADD(1000000);
    Bob.ADD(2000000);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual(3000000);
    expect(Bob.value).toEqual(3000000);
  });

  it("Can handle decimal numbers", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    Alice.ADD(3.14);
    Bob.ADD(2.86);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toBeCloseTo(6.0);
    expect(Bob.value).toBeCloseTo(6.0);
  });

  it("Can handle many concurrent operations", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");
    const Chris = new CounterCrdt("Chris");

    for (let i = 0; i < 10; i++) {
      Alice.ADD(1);
      Bob.ADD(2);
      Chris.ADD(3);
    }

    Alice.mergeChanges(Bob.getChanges());
    Alice.mergeChanges(Chris.getChanges());

    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Chris.getChanges());

    Chris.mergeChanges(Alice.getChanges());
    Chris.mergeChanges(Bob.getChanges());

    expect(Alice.value).toEqual(60);
    expect(Bob.value).toEqual(60);
    expect(Chris.value).toEqual(60);
  });

  it("Can handle alternating ADD and SUB", () => {
    const Alice = new CounterCrdt("Alice");

    for (let i = 0; i < 10; i++) {
      Alice.ADD(5);
      Alice.SUB(3);
    }

    expect(Alice.value).toEqual(20);
  });

  it("Can handle empty counter", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    expect(Alice.value).toEqual(0);
    expect(Bob.value).toEqual(0);

    Alice.mergeChanges(Bob.getChanges());

    expect(Alice.value).toEqual(0);
  });

  it("Can handle SUB before ADD", () => {
    const Alice = new CounterCrdt("Alice");

    Alice.SUB(5);

    expect(Alice.value).toEqual(-5);

    Alice.ADD(10);

    expect(Alice.value).toEqual(5);
  });

  it("Can handle concurrent SUB operations", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    Alice.ADD(100);
    Bob.mergeChanges(Alice.getChanges());

    Alice.SUB(30);
    Bob.SUB(40);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual(30);
    expect(Bob.value).toEqual(30);
  });

  it("Can verify idempotent merge operations", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    Alice.ADD(10);

    // Merge same changes multiple times
    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Bob.value).toEqual(10);

    // Verify changes array isn't duplicated
    expect(Bob.getChanges().length).toBe(1);
  });

  it("Can verify idempotent value getter", () => {
    const Alice = new CounterCrdt("Alice");

    Alice.ADD(5);
    Alice.ADD(3);

    const value1 = Alice.value;
    const value2 = Alice.value;
    const value3 = Alice.value;

    expect(value1).toEqual(8);
    expect(value2).toEqual(8);
    expect(value3).toEqual(8);
  });

  it("Can handle five-way concurrent operations", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");
    const Chris = new CounterCrdt("Chris");
    const Diana = new CounterCrdt("Diana");
    const Eve = new CounterCrdt("Eve");

    Alice.ADD(1);
    Bob.ADD(2);
    Chris.ADD(3);
    Diana.ADD(4);
    Eve.ADD(5);

    const nodes = [Alice, Bob, Chris, Diana, Eve];

    // Full mesh sync
    nodes.forEach((node) => {
      nodes.forEach((other) => {
        if (node !== other) {
          node.mergeChanges(other.getChanges());
        }
      });
    });

    expect(Alice.value).toEqual(15);
    expect(Bob.value).toEqual(15);
    expect(Chris.value).toEqual(15);
    expect(Diana.value).toEqual(15);
    expect(Eve.value).toEqual(15);
  });

  it("Can handle complex concurrent ADD/SUB patterns", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    Alice.ADD(10);
    Bob.mergeChanges(Alice.getChanges());

    // Concurrent operations
    Alice.ADD(5);
    Alice.SUB(3);

    Bob.ADD(7);
    Bob.SUB(4);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    // 10 + 5 - 3 + 7 - 4 = 15
    expect(Alice.value).toEqual(15);
    expect(Bob.value).toEqual(15);
  });

  it("Can handle stress test with many operations", () => {
    const Alice = new CounterCrdt("Alice");

    for (let i = 1; i <= 100; i++) {
      Alice.ADD(i);
    }

    // Sum of 1 to 100 = 5050
    expect(Alice.value).toEqual(5050);

    const Bob = new CounterCrdt("Bob", Alice.getChanges());

    expect(Bob.value).toEqual(5050);
  });

  it("Can handle partial sync scenario", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");
    const Chris = new CounterCrdt("Chris");

    Alice.ADD(10);
    Bob.ADD(20);
    Chris.ADD(30);

    // Partial sync chain - Bob gets Alice's changes
    Bob.mergeChanges(Alice.getChanges());
    // Chris gets Bob's changes (which now include Alice's)
    Chris.mergeChanges(Bob.getChanges());

    expect(Alice.value).toEqual(10);
    expect(Bob.value).toEqual(30); // 10 + 20
    expect(Chris.value).toEqual(60); // 30 + 10 + 20

    // Complete sync
    Alice.mergeChanges(Bob.getChanges());
    Alice.mergeChanges(Chris.getChanges());

    expect(Alice.value).toEqual(60);
  });

  it("Can handle only SUB operations", () => {
    const Alice = new CounterCrdt("Alice");
    const Bob = new CounterCrdt("Bob");

    Alice.SUB(5);
    Bob.SUB(3);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual(-8);
    expect(Bob.value).toEqual(-8);
  });

  it("Can handle rapid sequential operations", () => {
    const Alice = new CounterCrdt("Alice");

    for (let i = 0; i < 1000; i++) {
      if (i % 2 === 0) {
        Alice.ADD(1);
      } else {
        Alice.SUB(1);
      }
    }

    // Should end up at 0 (500 adds, 500 subs)
    expect(Alice.value).toEqual(0);
  });

  it("Can handle initialization with empty changes", () => {
    const Alice = new CounterCrdt("Alice", []);

    expect(Alice.value).toEqual(0);

    Alice.ADD(5);

    expect(Alice.value).toEqual(5);
  });

  it("Can handle getChanges returns correct format", () => {
    const Alice = new CounterCrdt("Alice");

    Alice.ADD(5);
    Alice.SUB(3);

    const changes = Alice.getChanges();

    expect(changes.length).toBe(2);
    expect(changes[0].t).toBe("ADD");
    expect(changes[0].v).toBe(5);
    expect(changes[0].a).toBe("Alice");
    expect(changes[1].t).toBe("SUB");
    expect(changes[1].v).toBe(3);
    expect(changes[1].a).toBe("Alice");
  });
});

