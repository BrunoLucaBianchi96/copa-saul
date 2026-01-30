# Copa Saul - Development Guidelines

## Optimistic UI Updates

All transactions should be optimistic. Apply changes to the UI immediately, then roll them back only if the server returns an error. Do not wait for confirmation from the server to update the UI - this makes the app feel unresponsive.

Example pattern:
```typescript
// Optimistically update UI immediately
setState(newValue)

try {
  const res = await fetch(...)
  if (!res.ok) {
    // Roll back on failure
    setState(previousValue)
    alert('Error message')
  }
} catch {
  // Roll back on network error
  setState(previousValue)
  alert('Network error')
}
```
