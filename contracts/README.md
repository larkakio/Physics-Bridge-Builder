# CheckIn (Foundry)

Deploy to Base mainnet (chain id 8453), then set `NEXT_PUBLIC_CHECK_IN_CONTRACT_ADDRESS` in the Vercel project for the `web/` app.

```bash
cd contracts
forge build
forge test
```

Example deploy (use your own RPC and key handling):

```bash
forge create src/CheckIn.sol:CheckIn --rpc-url "$BASE_MAINNET_RPC" --broadcast
```

Copy the deployed address into `web/.env.local` as `NEXT_PUBLIC_CHECK_IN_CONTRACT_ADDRESS`.

Current deployment (Base mainnet): `0xF103a95E8bA8067AC363d66E9EF2E007Fea85E33`.
