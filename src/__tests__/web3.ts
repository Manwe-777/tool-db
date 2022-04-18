import w3 from "web3";

const web3 = new w3(w3.givenProvider);

it("Can use web3", () => {
  const account = web3.eth.accounts.create();
  const message = "Hello world";

  const signature = web3.eth.accounts.sign(message, account.privateKey);
  const signingAddress = web3.eth.accounts.recover(
    message,
    signature.signature
  );

  expect(signingAddress).toBe(account.address);
});
