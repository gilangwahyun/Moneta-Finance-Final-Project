# Code Writing Guidelines

This document outlines the coding standards and conventions for this project, which utilizes TypeScript, Next.js, React, Prisma, IndexedDB, service workers, and offline-first synchronization. Adherence to these guidelines ensures that future implementation, refactoring, and feature additions remain readable, maintainable, and consistent.

## 1. File Structure Convention

- Keep files focused on a single responsibility.
- Place related files close to each other (colocation).
- Use `kebab-case` for file names (e.g., `budget-reallocation.ts`, `user-profile.tsx`).
- Keep components, hooks, and utilities in their respective descriptive directories.

## 2. Commenting Convention

### Single-Line Explanatory Comments

Use this style for single-line explanatory comments:

```typescript
/********** Comment text. */
```

**Rules:**
- Use this for meaningful explanations only.
- Do not comment obvious code.
- Do not add comments to every line.
- Prefer explaining why a decision exists, not simply repeating what the code does.

**Example:**
*Good:*
```typescript
/********** Prevent invalid transfer when the source and target budget are the same. */
if (sourceBudgetId === targetBudgetId) return null;
```

*Bad:*
```typescript
/********** Add one to counter. */
counter++;
```

### Multi-Logic Block Comment Style

For complex logic or multi-step business rules, use:

```typescript
/********** [START: Description] **********/

// ...code...

/********** [END: Description] **********/
```

**Rules:**
- Use this only for complex or multi-step logic.
- Keep the description short and meaningful.
- START and END labels must match.
- Do not use block markers for very small functions.

**Example:**
```typescript
/********** [START: Build Budget Reallocation Recommendation] **********/

const targetDeficit = targetSpent - targetLimit;
if (targetDeficit <= 0) return null;

const maxTransferable = sourceRemaining - minimumSourceRemainingAfterTransfer;
const recommendedAmount = Math.min(targetDeficit, maxTransferable);

/********** [END: Build Budget Reallocation Recommendation] **********/
```

## 3. Segment Naming Convention

Use this style to separate major file sections:

```typescript
/********** Segment Name **********/
```

**Recommended segment names:**

*For general TypeScript files:*
- Imports
- Types
- Constants
- Helpers
- Main Logic
- Exports

*For React component files:*
- Imports
- Types
- Constants
- Component
- State
- Derived State
- Event Handlers
- Effects
- Render Helpers
- Exports

*For API route files:*
- Imports
- Types
- Constants
- Validation
- Helpers
- Request Handler
- Error Handling
- Exports

*For repository/local DB files:*
- Imports
- Types
- Store Constants
- Mappers
- Queries
- Mutations
- Sync Helpers
- Exports

*For service worker files:*
- Imports
- Constants
- Helpers
- Install Handler
- Activate Handler
- Fetch Handler
- Push Handler
- Notification Click Handler
- Message Handler

**Rules:**
- Use segment comments only when the file is long enough to need structure.
- Do not over-segment very small files.
- Keep segment order consistent where possible.

## 4. TSDoc Convention

Use TSDoc for every exported function and every non-trivial internal function.

TSDoc must include:
- A short function description.
- `@param` for each parameter.
- `@returns` when the function returns a meaningful value.
- `@throws` if the function intentionally throws an error.
- **Side effects** if the function writes to IndexedDB, localStorage, the sync queue, or the server.

**Example:**
```typescript
/**
 * Finds a safe budget reallocation recommendation for an over-limit target budget.
 *
 * The recommendation only suggests an amount that can reduce or cover the target
 * deficit. It does not execute the reallocation automatically.
 *
 * @param params - Budget, category, and transaction data required for evaluation.
 * @returns A recommendation object when a safe source budget exists; otherwise null.
 */
export function findBudgetReallocationRecommendation(params: ReallocationParams): ReallocationRecommendation | null {
  // ...
}
```

**Rules:**
- Do not write vague TSDoc such as “This function handles data.”
- Explain business rules clearly when the function implements product logic.
- Mention offline-first side effects when relevant.

## 5. Function Writing Convention

1. **Prefer small focused functions.** Do one thing and do it well.
2. **Use guard clauses to reduce nesting.** (See Guard Clause Convention).
3. **Avoid mixing concerns.** Do not mix validation, transformation, database mutation, and UI logic in one function.
4. **Extract helper functions** for repeated business rules.
5. **Do not silently swallow errors.** Always handle them appropriately.
6. **Use explicit return types** for exported functions.
7. **Avoid magic numbers;** use named constants instead.
8. **Keep rules centralized.** Keep recommendation, notification, and sync rules centralized in their respective domains.
9. **Avoid duplicating business logic** across the UI and engine.

## 6. Type/Interface Convention

1. **Use `type` or `interface` consistently.** (Prefer `type` for unions/intersections, `interface` for object shapes that may be extended).
2. **Name types descriptively.** Use `PascalCase` for types and interfaces.
3. **Avoid `any`.** Use `unknown` if the type is truly unknown, and narrow it down safely.
4. **Export shared types** from a centralized location if used across multiple features.

## 7. Error Handling Convention

1. **Use clear error messages** that explain what went wrong and potentially how to fix it.
2. **Do not hide errors** with empty catch blocks. If an error is safely ignorable, document *why* with a comment.
3. **For sync errors, preserve failed item context** so that retries or user interventions have enough data.
4. **For user-facing failures, show safe fallback messages.** Do not leak internal stack traces to the UI.
5. **For server API errors, return structured JSON** (e.g., `{ error: string, code: string }`).
6. **Never expose sensitive internal details** (like DB queries or API keys) to users.

## 8. Async/Await Convention

1. **Prefer `async/await`** over raw `.then().catch()` chains for readability.
2. **Use `Promise.all`** when awaiting multiple independent asynchronous operations concurrently.
3. **Always wrap `await` calls in `try/catch`** blocks where errors are expected or need specific handling.
4. **Async functions should describe the action clearly** (e.g., `fetchUserData`, `syncOfflineMutations`).

## 9. Guard Clause Convention

1. **Fail fast and return early.** Check for invalid states or negative conditions at the top of the function to avoid deep nesting.
2. **Return `null` or early results** when conditions are not met, keeping the "happy path" un-indented at the bottom.

**Example:**
*Good:*
```typescript
export function processTransfer(amount: number) {
  if (amount <= 0) return null;
  if (!hasSufficientFunds(amount)) throw new Error("Insufficient funds");
  
  // Happy path
  executeTransfer(amount);
}
```

## 10. Import/Export Convention

1. **Group imports.** Prefer grouping by: Node built-ins, external dependencies, internal aliases (`@/components`), and relative imports (`./utils`).
2. **Use named exports** over default exports for better discoverability and refactoring support. Default exports can be used for Next.js pages or React components where expected by the framework.

## 11. Logging/Debug Convention

1. **Debug logs should use consistent prefixes.**
2. **Do not log sensitive financial details unnecessarily.**
3. **Temporary logs must be marked and removed** before final submission if not needed.
4. **Suggested prefixes:**
   - `[SyncPerf]`
   - `[PullPerf]`
   - `[PushPerf]`
   - `[DailyCapDebug]`
   - `[DigestTimer]`
   - `[LocalEngine]`
   - `[NotificationClick]`
   - `[ReallocationRecommendation]`

## 12. TODO/FIXME Convention

1. **Use `TODO:`** for planned improvements or missing features.
2. **Use `FIXME:`** for known issues or broken code that needs immediate attention.
3. Include context or a related issue tracker ticket if applicable (e.g., `TODO(Ticket-123): Refactor this after API upgrade`).

## 13. Offline-First and Sync-Related Code Convention

1. **Local write should happen first.** The application must feel immediate.
2. **Sync queue should record changes after local write.**
3. **Pulled remote records must not be re-enqueued** as local changes.
4. `readAt`, `pushedAt`, `digestSentAt`, and `action` metadata must sync consistently.
5. **Push and pull should preserve `clientId`.**
6. **Never assume server ID is available** in offline UI; rely on `clientId` for immediate local referencing.
7. **Conflict handling must not be removed** for performance optimization.
8. **Batch database reads** where possible to avoid N+1 query issues in local engines (e.g., IndexedDB).

## 14. Examples of Good and Bad Code Style

### Naming Guidelines

1. **Use descriptive names.**
2. **Boolean variables should start with** `is`/`has`/`can`/`should`.
3. **Async functions should describe the action clearly.**
4. **Use `clientId`/`serverId` naming explicitly** when both exist.
5. **Avoid ambiguous names** such as `data`, `item`, `temp`, `result` unless the scope is very small.

**Examples:**

*Good:*
- `isDailyCapReached`
- `shouldFireDigest`
- `sourceBudgetClientId`
- `targetBudgetClientId`
- `buildReallocationCtaRoute`

*Bad:*
- `check`
- `processData`
- `handleThing`
- `id` (when both `clientId` and `serverId` exist)
