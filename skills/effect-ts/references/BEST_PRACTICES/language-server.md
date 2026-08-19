# Effect language server reference

The Effect Language Service is a TypeScript plugin with Effect-specific diagnostics, completions, refactors, and hover information. It detects errors that TypeScript alone cannot find.

## Installation

```bash
npm install @effect/language-service --save-dev
```

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@effect/language-service" }]
  }
}
```

## Editor setup

### VSCode

1. Install TypeScript workspace version (ensure `typescript` is in devDependencies)
2. Press F1 → "TypeScript: Select TypeScript Version" → "Use Workspace Version"

### JetBrains (WebStorm, IntelliJ)

Settings → Languages & Frameworks → TypeScript → Select workspace `node_modules/typescript`

### Neovim (nvim-lspconfig)

Configure `tsserver` with the plugin:

```lua
require('lspconfig').tsserver.setup({
  init_options = {
    plugins = {
      {
        name = "@effect/language-service",
        location = vim.fn.getcwd() .. "/node_modules/@effect/language-service"
      }
    }
  }
})
```

### Emacs (lsp-mode)

```elisp
(setq lsp-clients-typescript-plugins
      (vector (list :name "@effect/language-service"
                    :location (expand-file-name "node_modules/@effect/language-service"
                                                (projectile-project-root)))))
```

## Configuration options

Configure in `tsconfig.json` under the plugin entry:

```json
{
  "compilerOptions": {
    "plugins": [{
      "name": "@effect/language-service",
      "refactors": { "allEnabled": true },
      "diagnostics": { "allEnabled": true },
      "quickinfo": { "allEnabled": true },
      "completions": { "allEnabled": true }
    }]
  }
}
```

### Refactors

| Refactor | Default | Description |
|----------|---------|-------------|
| `asyncAwaitToGenTryPromise` | ✓ | Convert async/await to Effect.gen with Effect.tryPromise |
| `toggleTypeAnnotation` | ✓ | Add/remove return type annotations |
| `wrapWithEffectGen` | ✓ | Wrap selection in Effect.gen |
| `addPipeToEffectUse` | ✓ | Add pipe to effectful expression |
| `arrowToEffectGenFunction` | ✓ | Convert arrow function to Effect.gen |
| `functionToEffectGenFunction` | ✓ | Convert function to Effect.gen |
| `removeLayerCompose` | ✓ | Simplify Layer.compose |

### Diagnostics

| Diagnostic | Default | Description |
|------------|---------|-------------|
| `floatingEffect` | ✓ | Detects unhandled Effect values |
| `missingProvide` | ✓ | Detects missing service requirements |
| `effectYieldNonEffect` | ✓ | Detects yielding non-Effect in generator |
| `noExplicitResourceManagement` | ✓ | Detects missing using/await using |
| `noFloatingPromises` | ✓ | Detects unhandled Promises |
| `forbiddenTags` | ✓ | Detects using forbidden error tags |
| `unnecessaryEffectYield` | ✓ | Detects unnecessary Effect.succeed yield |
| `unnecessaryFlatMap` | ✓ | Detects flatMap that could be map |
| `unnecessaryMap` | ✓ | Detects map with identity function |

### Quick info

| Feature | Default | Description |
|---------|---------|-------------|
| `showEffectTypeParamsOnHover` | ✓ | Shows Success/Error/Requirements on hover |

### Completions

| Completion | Default | Description |
|------------|---------|-------------|
| `self` | ✓ | Auto-complete `Self` type parameter |
| `durationStrings` | ✓ | Auto-complete Duration.decode strings |
| `brands` | ✓ | Auto-complete Schema brand strings |

### Key patterns

Configure recognized Effect-like patterns:

```json
{
  "compilerOptions": {
    "plugins": [{
      "name": "@effect/language-service",
      "keyPatterns": {
        "Effect": "Effect\\.Effect",
        "Layer": "Layer\\.Layer",
        "Stream": "Stream\\.Stream"
      }
    }]
  }
}
```

## CLI tools

The language service includes CLI commands for development and CI/CD workflows.

### Setup check

Verify installation:

```bash
npx effect-language-service setup
```

### Build-time diagnostics

Patch TypeScript to run language service diagnostics during `tsc`:

```bash
npx effect-language-service patch
```

This enables CI enforcement of Effect-specific rules. Errors like floating Effects will now fail the build.

To unpatch:

```bash
npx effect-language-service unpatch
```

### Project-wide diagnostics

Run all diagnostics without patching:

```bash
npx effect-language-service diagnostics
npx effect-language-service diagnostics --fix  # Auto-fix where possible
```

### Quick fixes

Apply quick fixes interactively:

```bash
npx effect-language-service quickfixes
```

### Code generation

Generate boilerplate from Effect patterns:

```bash
npx effect-language-service codegen
```

### Project overview

Get a summary of Effect usage in your project:

```bash
npx effect-language-service overview
```

Shows:
- Service definitions
- Error types
- Layer composition graph
- Schema definitions

### Layer information

Analyze Layer dependencies:

```bash
npx effect-language-service layerinfo
npx effect-language-service layerinfo --graph  # Output as graph
```

## Common diagnostics

### Floating Effect

```typescript
// ERROR: Effect is created but never used
Effect.succeed(42)

// FIX: Use yield* or pipe to runPromise
yield* Effect.succeed(42)
// or
await Effect.runPromise(Effect.succeed(42))
```

### Missing requirements

```typescript
// ERROR: UserService is required but not provided
const program = UserService.findById(id)
// FIX: Add to Layer composition
const MainLive = Layer.provide(program, UserService.Default)
```

### Yield non-Effect

```typescript
// ERROR: Yielding a non-Effect value
yield* Promise.resolve(42)

// FIX: Wrap in Effect.promise
yield* Effect.promise(() => Promise.resolve(42))
```

### Forbidden tags

```typescript
// ERROR: "Error" is a forbidden error tag (too generic)
class MyError extends Schema.TaggedError<MyError>()("Error", {}) {}

// FIX: Use descriptive tag
class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()(
  "UserNotFoundError",
  { userId: UserId, message: Schema.String }
) {}
```

## Troubleshooting

### Language service not loading

1. Ensure `typescript` is in devDependencies (not just dependencies)
2. Restart the TypeScript server (VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server")
3. Verify workspace TypeScript is selected

### Diagnostics not appearing

1. Check `tsconfig.json` plugin configuration
2. Ensure the file is included in the TypeScript project
3. Check for `"diagnostics": { "allEnabled": false }` in config

### Performance issues

For large codebases, disable expensive diagnostics:

```json
{
  "compilerOptions": {
    "plugins": [{
      "name": "@effect/language-service",
      "diagnostics": {
        "allEnabled": true,
        "missingProvide": false  // Expensive on large projects
      }
    }]
  }
}
```
