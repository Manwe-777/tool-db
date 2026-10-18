import { Browser, Page, expect, test } from "@playwright/test";

// The example chat app in a real browser: accounts, groups, join requests,
// end to end encrypted messages, and unlocking after a reload. Each user has
// its own browser context, so its own IndexedDB and localStorage.

const PASSWORD = "e2e-test-password";

async function newUser(browser: Browser, name: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await page.getByPlaceholder("Your name").fill(name);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Connected")).toBeVisible();
  return page;
}

async function sendMessage(page: Page, text: string) {
  await page.getByPlaceholder(/Write a message/).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

async function inviteLink(page: Page): Promise<string> {
  // Read what "Copy invite link" copies, without clipboard permissions
  await page.evaluate(() => {
    navigator.clipboard.writeText = async (text: string) => {
      (window as any).copied = text;
    };
  });
  await page.getByRole("button", { name: "Copy invite link" }).click();
  return page.evaluate(() => (window as any).copied);
}

test("Two users chat in an encrypted group", async ({ browser }) => {
  const alice = await newUser(browser, "Alice");
  await alice.getByPlaceholder("New group name").fill("Friends");
  await alice.getByRole("button", { name: "Create" }).click();
  await expect(alice.getByRole("heading", { name: "Friends" })).toBeVisible();
  await sendMessage(alice, "Hello from Alice!");
  await expect(alice.getByText("Hello from Alice!")).toBeVisible();

  // Bob asks to join with the invite link
  const link = await inviteLink(alice);
  const bob = await newUser(browser, "Bob");
  await bob.getByPlaceholder("Paste an invite link").fill(link);
  await bob.getByRole("button", { name: "Join" }).click();
  await expect(bob.getByText("Waiting for the owner")).toBeVisible();

  // Alice sees the request live and accepts it
  await expect(alice.getByText("Join requests")).toBeVisible();
  await alice.getByRole("button", { name: "Accept" }).click();

  // Bob gets the group key, and can read the history and reply
  await expect(bob.getByText("Hello from Alice!")).toBeVisible();
  await sendMessage(bob, "Hi Alice, Bob here");
  await expect(alice.getByText("Hi Alice, Bob here")).toBeVisible();
  // Names come from the users' Nostr profiles
  await expect(
    alice.locator(".message .author", { hasText: "Bob" })
  ).toBeVisible();

  // Someone who is not a member can not read the group
  const chris = await newUser(browser, "Chris");
  await chris.getByPlaceholder("Paste an invite link").fill(link);
  await chris.getByRole("button", { name: "Join" }).click();
  await expect(chris.getByText("Waiting for the owner")).toBeVisible();
  await expect(chris.getByText("Hello from Alice!")).toHaveCount(0);

  // Alice comes back later: wrong password first, then the right one
  await alice.reload();
  await expect(alice.getByText("Welcome back, Alice")).toBeVisible();
  await alice.getByPlaceholder("Password").fill("not the password");
  await alice.locator("form").getByRole("button", { name: "Unlock" }).click();
  await expect(alice.getByText("Wrong password")).toBeVisible();
  await alice.getByPlaceholder("Password").fill(PASSWORD);
  await alice.locator("form").getByRole("button", { name: "Unlock" }).click();
  await expect(alice.getByText("Hello from Alice!")).toBeVisible();
  await expect(alice.getByText("Hi Alice, Bob here")).toBeVisible();
});

test("Stores only encrypted messages", async ({ browser }) => {
  const alice = await newUser(browser, "Alice");
  await alice.getByPlaceholder("New group name").fill("Secrets");
  await alice.getByRole("button", { name: "Create" }).click();
  await sendMessage(alice, "a very secret message");
  await expect(alice.getByText("a very secret message")).toBeVisible();

  // Everything in the browser's local storage (IndexedDB) is ciphertext
  const stored = await alice.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open("tooldb-chat");
        open.onerror = reject;
        open.onsuccess = () => {
          const db = open.result;
          const request = db
            .transaction("tooldb-chat", "readonly")
            .objectStore("tooldb-chat")
            .getAll();
          request.onsuccess = () => resolve(JSON.stringify(request.result));
          request.onerror = reject;
        };
      })
  );
  expect(stored).toContain("messages-");
  expect(stored).not.toContain("a very secret message");
});
