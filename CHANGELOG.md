# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **font-metrics:** Parse fonts in an isolated worker ([`e71877a`](https://github.com/fogrew/font-fallback/commit/e71877a2adef02007ae16077c354b08011dfc9ed))
- **i18n:** Add Paraglide with prefixed EN/RU routes and locale scaffolding ([`7b57b94`](https://github.com/fogrew/font-fallback/commit/7b57b94d185c585e792ffdcae76cb6d6deaeb898))

### Fixed

- Catch bare parent paths in the .astro scan and align wording ([`75aa531`](https://github.com/fogrew/font-fallback/commit/75aa531a0e07574b1efc8485fa8faada6f58413a))
- Scan every relative path literal in .astro files ([`b1b12fd`](https://github.com/fogrew/font-fallback/commit/b1b12fd12d45dad98813e5dca8f5f08293b19921))
- Harden the .astro import scanner and document the env-scrub limit ([`1158ec6`](https://github.com/fogrew/font-fallback/commit/1158ec6a9c2a00a3c28d99d63d9e0bc85cf2c3dc))
- **test:** Avoid the ErrorEvent global in the worker-task test ([`134deb8`](https://github.com/fogrew/font-fallback/commit/134deb8f82139714b754db4b92a0cbe0b7f62fce))
- **font-metrics:** Cap cmap group counts and validate reply error codes ([`7b31f03`](https://github.com/fogrew/font-fallback/commit/7b31f03f453946007a7c9e8ba11c818392dc4509))
- **font-metrics:** Surface the decoder limit and tighten hardening tests ([`ab478b8`](https://github.com/fogrew/font-fallback/commit/ab478b87436983be50b20b323d225f8305e01d3f))
- **font-metrics:** Bound untrusted font decoding and harden the worker client ([`6f3b13c`](https://github.com/fogrew/font-fallback/commit/6f3b13ce698054924ce8277daaa67803d1e56522))
- **i18n:** Harden redirect, message proxy and locale scaffolding ([`4e09abc`](https://github.com/fogrew/font-fallback/commit/4e09abc150daf0cb93b0ad796c7b92adb7ae194d))
- Reject NaN in clamp and strengthen its property tests ([`1f73b97`](https://github.com/fogrew/font-fallback/commit/1f73b97e2451cfca15a09c4e2ff6b85e957362ad))

[Unreleased]: https://github.com/fogrew/font-fallback/commits/develop


