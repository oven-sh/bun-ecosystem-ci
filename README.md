<p align="center">
  <a href="https://bun.sh"><img src="https://github.com/user-attachments/assets/50282090-adfd-4ddb-9e27-c30753c6b161" alt="Logo" height=170></a>
</p>
<h1 align="center">Bun Ecosystem CI</h1>

Runs [Bun](https://bun.sh) against packages and apps in the JavaScript ecosystem.

This Repository has two main purposes:

1. Warn Bun developers of potential regressions before they are released.
2. Show examples of how easy it is to migrate to Bun 🐰

To install dependencies:

```bash
bun install
```

To run tests locally:

```bash
bun start
# See `bun start -h` for a full list of options
```

## Getting Your Package Tested

Packages are added based on several criteria, including popularity and the variety
of internal Bun modules they use. The Bun team is not currently accepting
requests to add packages to this test suite.
