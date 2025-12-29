# Release Command

Release a new version of the GTKX library.

## Arguments

- `$ARGUMENTS`: Version bump type - must be either `patch` (for bug fixes or additions) or `minor` (for breaking changes)

## Instructions

You are releasing a new version of the GTKX library. Follow these steps exactly:

### Step 1: Validate Arguments

The user must provide a version bump type as `$ARGUMENTS`. Valid values are:
- `patch` - for bug fixes or feature additions
- `minor` - for breaking changes

If `$ARGUMENTS` is empty or not one of these values, ask the user to specify either `patch` or `minor`.

### Step 2: Run Quality Checks

Run the following commands from the repository root, stopping if any command fails:

```bash
pnpm codegen
pnpm build
pnpm lint
pnpm knip
pnpm test
pnpm run docs   # Note: use "pnpm run docs", not "pnpm docs" (which opens docs in browser)
```

If any command fails, report the error and stop the release process.

### Step 3: Determine Version Numbers

1. Get the current version from `packages/react/package.json`
2. Calculate the new version based on the bump type:
   - `patch`: increment the patch version (e.g., 0.10.2 -> 0.10.3)
   - `minor`: increment the minor version and reset patch to 0 (e.g., 0.10.2 -> 0.11.0)

### Step 4: Get the Last Tag

Get the most recent tag from the remote:

```bash
git fetch --tags
git describe --tags --abbrev=0
```

### Step 5: Generate Changelog

Generate a changelog by analyzing the actual code changes between the last tag and HEAD:

```bash
git diff <last-tag>..HEAD --stat
git diff <last-tag>..HEAD
```

Analyze the diff output to understand what actually changed in the codebase. Write a concise changelog that describes the meaningful changes (new features, bug fixes, improvements, refactoring). Focus on what the changes do, not what the commit messages say. Group related changes together and use clear, user-friendly language.

Do NOT include commit hashes or reference commit messages - describe the actual changes based on the code diff.

### Step 6: Confirm Release

**IMPORTANT:** Before proceeding with the release, you MUST:

1. Display the changelog to the user, formatted clearly with:
   - The new version number that will be released
   - The list of changes that will be included
2. Ask the user to confirm they want to proceed with the release using the AskUserQuestion tool
3. If the user declines, stop the release process immediately

Do NOT proceed to the next step without explicit user confirmation.

### Step 7: Bump Versions

Update the `version` field in these public package.json files to the new version:
- `packages/react/package.json`
- `packages/ffi/package.json`
- `packages/native/package.json`
- `packages/cli/package.json`
- `packages/css/package.json`
- `packages/testing/package.json`
- `packages/gir/package.json`

Do NOT update the private packages (`packages/codegen/package.json` and `packages/e2e/package.json`).

### Step 8: Commit and Tag

Create a commit with all the version changes:

```bash
git add packages/*/package.json
git commit -m "vX.Y.Z"
git tag vX.Y.Z
```

Where X.Y.Z is the new version number.

### Step 9: Push Changes

Push the commit and tag to the remote:

```bash
git push
git push --tags
```

### Step 10: Create GitHub Release

Create a GitHub release using the gh CLI with the generated changelog:

```bash
gh release create vX.Y.Z --title "vX.Y.Z" --notes "<changelog>"
```

The release name and tag should both be the version (e.g., `v0.10.3`).

Do NOT commit the changelog as a file - it is only used for the GitHub release notes.

### Completion

Report the successful release with:
- The new version number
- A link to the GitHub release
- Summary of what was included in the release
