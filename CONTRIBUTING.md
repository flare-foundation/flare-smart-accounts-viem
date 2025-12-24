# Contributing

This document describes the process of contributing to this project. It is
intended for anyone considering opening an issue or pull request.

## AI Assistance

> [!IMPORTANT]
>
> If you are using **any kind of AI assistance** to contribute to this project,
> it must be disclosed in the pull request.

If you are using any kind of AI assistance while contributing to this project,
**this must be disclosed in the pull request**, along with the extent to which
AI assistance was used. Trivial tab-completion doesn't need to be disclosed, as
long as it is limited to single keywords or short phrases.

An example disclosure:

> This PR was written primarily by Claude Code.

Or a more detailed disclosure:

> I consulted ChatGPT to understand the codebase but the solution was fully
> authored manually by myself.

## Quick start

If you'd like to contribute, report a bug, suggest a feature or you've
implemented a feature you should open an issue or pull request.

Any contribution to the project is expected to contain code that is formatted,
linted and that the existing tests still pass. Adding unit tests for new code is
also welcome.

## Dev environment

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v22 or higher) - [Download Node.js](https://nodejs.org/)
- **pnpm** (v10.20.0 or higher) - Install with `npm install -g pnpm@10.20.0` or follow [pnpm installation guide](https://pnpm.io/installation)

You can verify your installations:

```sh
node --version  # Should be v22 or higher
pnpm --version  # Should be v10.20.0 or higher
```

### Setup

1. **Clone the repository** (if you haven't already):

```sh
git clone <repository-url>
cd smart-accounts-encoder
```

2. **Install dependencies**:

```sh
pnpm install
```

This will install all required dependencies including TypeScript, Vitest, ESLint, and Prettier.

3. **Verify the setup**:

```sh
pnpm test
```

If all tests pass, your development environment is set up correctly.

### Building the project

To build the project locally and verify your changes compile correctly:

```sh
pnpm build
```

This will:

- Remove the existing `dist` directory (via `prebuild` script)
- Compile TypeScript files from `src/` to JavaScript in `dist/`
- Generate type definition files (`.d.ts`) for TypeScript consumers

The built files will be in the `dist/` directory, which matches what gets published to npm.

### Testing your changes

After making changes, it's recommended to:

1. **Run the linter** to catch code style issues:

```sh
pnpm lint
```

2. **Format your code**:

```sh
pnpm format
```

3. **Run tests** to ensure nothing is broken:

```sh
pnpm test
```

4. **Build the project** to ensure TypeScript compilation succeeds:

```sh
pnpm build
```

## Linting and formatting

This project uses ESLint for linting and Prettier for code formatting.
Both are configured according to Flare Network's coding standards.

### Running the linter

To automatically fix auto-fixable linting issues:

```sh
pnpm lint
```

### Running the formatter

To format all files according to Prettier rules:

```sh
pnpm format
```

This will format all TypeScript files, JSON files, and Markdown files in the project.

### Running both

You can run both linting and formatting:

```sh
pnpm lint && pnpm format
```

## Testing

This project uses [Vitest](https://vitest.dev/) for unit testing. All test files should be named `*.test.ts` and placed alongside the code they test.

### Running tests

#### Run all tests once

```sh
pnpm test
```

This runs all test files and exits.

#### Run tests in watch mode

```sh
pnpm test-start
```

This runs tests in watch mode, automatically re-running tests when files change.

#### Run tests for a specific directory

To limit tests to a specific directory or file:

```sh
pnpm vitest run --root <path/to/dir>
```

Or for a specific test file:

```sh
pnpm vitest run <path/to/file>
```

To run in watch mode (without the `run` keyword), use:

```sh
pnpm vitest --root <path/to/dir>
```

Or for a specific test file in watch mode:

```sh
pnpm vitest <path/to/file>
```

### Test coverage

To run tests with coverage reporting:

```sh
pnpm coverage
```

This will generate a coverage report showing which parts of your code are covered by tests.

## Release process

This section describes the process for releasing new versions of the package to npm.

### Prerequisites for a release

Before creating a release, ensure:

1. **All tests pass**:

   ```sh
   pnpm test
   ```

2. **Code is properly linted and formatted**:

   ```sh
   pnpm lint && pnpm format
   ```

3. **TypeScript compilation succeeds**:

   ```sh
   pnpm build
   ```

4. **All changes are committed** to the repository

5. **CHANGELOG.md is updated** with release notes describing:
   - New features
   - Bug fixes
   - Breaking changes (if any)
   - Deprecations (if any)

6. **You have npm publish permissions** for the `smart-accounts-encoder` package

7. **You are authenticated with npm**:
   ```sh
   npm login
   ```

### Version numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes that are not backward compatible
- **MINOR** (0.x.0): New features that are backward compatible
- **PATCH** (0.0.x): Bug fixes that are backward compatible

Update the version in `package.json` before building and publishing.

### Manual release process

#### Step 1: Update version

Edit `package.json` and update the `version` field:

```json
{
  "version": "0.0.8"
}
```

#### Step 2: Update CHANGELOG.md

Add a new section documenting what changed in this release:

```markdown
## [0.0.8] - 2024-01-15

### Added

- New feature X

### Fixed

- Bug Y

### Changed

- Improvement Z
```

#### Step 3: Build the project

Clean the build directory and rebuild:

```sh
pnpm prebuild && pnpm build
```

This will:

- Remove the `dist` directory
- Compile TypeScript to JavaScript
- Generate type definition files

#### Step 4: Verify the build

Check that the `dist` directory contains the expected files:

- `dist/index.js` (main entry point)
- `dist/index.d.ts` (type definitions)
- Other compiled files

#### Step 5: Publish to npm

```sh
npm publish
```

<!---->

<!-- - how to create a release branch -->

<!-- - how to create a release tag -->

<!-- - how the release CI works where applicable -->

<!-- - how to create a release by hand if CI is not available -->

<!-- - what are the prerequisites for a release to be made -->

<!-- - what needs to be considered when making a release -->

<!-- - what is the possible impact of wrong / rough release -->
