# Vendored gitvfs packages

These tarballs are built from [gitvfs](https://github.com/meesvandongen/gitvfs) at `7abedb1b8b744e3b1c67ce142841013093412b6a`
(remote: https://github.com/meesvandongen/gitvfs) because `gitvfs-cms`, `gitvfs-github-msw` and `gitvfs-github-auth` are not
published to npm yet.

| Package | Version | File |
| --- | --- | --- |
| `gitvfs` | 0.1.1 | `vendor/gitvfs.tgz` |
| `gitvfs-cms` | 0.1.0 | `vendor/gitvfs-cms.tgz` |
| `gitvfs-github-msw` | 0.1.0 | `vendor/gitvfs-github-msw.tgz` |
| `gitvfs-github-auth` | 0.1.0 | `vendor/gitvfs-github-auth.tgz` |

Rebuild them from a gitvfs checkout:

```sh
node scripts/vendor-gitvfs.mjs ../gitvfs
pnpm install
```

When the packages are on npm, replace the `file:` dependencies in `packages/*/package.json` with
version ranges, run `pnpm install`, and delete this folder and `scripts/vendor-gitvfs.mjs`.
