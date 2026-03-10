# Masjid Protocol

Initial monorepo structure for:

- `front-end/` -> Next.js + RainbowKit + Wagmi + Viem
- `back-end/` -> reserved for Go backend (to be audited next)
- `smart-contract/` -> Foundry project
- `docs/` -> Docusaurus docs site

## Run

Frontend:

```bash
cd front-end
npm run dev
```

Docs:

```bash
cd docs
npm start
```

Smart contract:

```bash
cd smart-contract
forge build
```
