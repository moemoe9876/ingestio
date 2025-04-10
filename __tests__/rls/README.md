# Supabase RLS Testing

This directory contains automated tests for Supabase Row Level Security (RLS) policies. These tests ensure that data isolation and access control are properly enforced at the database level.

## Prerequisites

1. **Environment Setup:**
   - A Supabase instance (preferably local or staging, NOT production)
   - RLS policies should be properly applied to all tables

2. **Environment Variables:**
   Make sure the following environment variables are set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **JWT Authentication:**
   These tests use JWT tokens for authentication. The `utils.ts` file includes a placeholder JWT generation function that needs to be implemented to match your Supabase JWT verification setup.

## Running Tests

Run the RLS tests using the following command:

```bash
pnpm test:rls
```

This sets the `RUN_RLS_TESTS=true` environment variable, which is required to run the tests.

To run tests for a specific table:

```bash
pnpm test:rls __tests__/rls/users.test.ts
```

To run tests in watch mode:

```bash
RUN_RLS_TESTS=true pnpm vitest watch __tests__/rls/users.test.ts
```

## Test Structure

- **utils.ts** - Shared utility functions and test setup
- **users.test.ts** - Tests for the users table RLS policies
- **profiles.test.ts** - Tests for the profiles table RLS policies
- **documents.test.ts** - Tests for the documents table RLS policies

## Adding New Tests

To add tests for additional tables, follow these patterns:

1. Create a new test file named `table-name.test.ts`
2. Use the `setupRlsTest` helper from `utils.ts`
3. Test all operations (SELECT, INSERT, UPDATE, DELETE) with different user contexts
4. Test both positive scenarios (operations that should succeed) and negative scenarios (operations that should fail)

## Understanding the Results

- Tests verify both positive and negative scenarios
- For "CANNOT" tests, there are two possible outcomes:
  - An error with code "42501" (permission denied)
  - No error but 0 rows affected/returned
- The specific behavior depends on whether the policy uses a `USING` clause or `WITH CHECK` clause

## Important Notes

1. These tests modify data in your database. Always run them against a non-production environment.
2. The tests create test users with specific IDs ('user_123' and 'user_456'). Make sure these IDs don't conflict with existing users.
3. Clean up operations are included but might not catch all edge cases. Periodic manual cleanup may be necessary.
4. RLS testing is meant to complement, not replace, application-level authorization testing. 