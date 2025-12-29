# Sori Test Suite

This directory contains comprehensive unit tests for the Sori feedback management platform.

## Test Coverage

### 1. Component Tests
- **DataTable Component** (`components/__tests__/DataTable.test.tsx`)
  - Rendering with various data configurations
  - User interactions (row clicks, hover states)
  - Empty states and loading states
  - Custom styling and className props
  - Accessibility compliance
  - Edge cases (large datasets, single items, empty columns)

### 2. Authentication & Authorization Tests
- **auth-helpers** (`server/__tests__/auth-helpers.test.ts`)
  - Session user ID extraction
  - Organization membership verification
  - Admin role checking
  - Project access control
  - Error handling for unauthorized access
  - Concurrent request handling

- **api-auth** (`lib/__tests__/api-auth.test.ts`)
  - API key format validation
  - Bearer token authentication
  - Database error handling
  - Edge cases (long keys, special characters, case sensitivity)

### 3. API Route Tests
- **Feedback API** (`routes/api/v1/__tests__/feedback-api.test.ts`)
  - Rate limiting (10 requests per minute per IP)
  - Origin validation (exact match, wildcards, subdomains)
  - SSRF protection for webhook URLs
  - Input validation (required fields, email format, message length)
  - CORS header generation
  - Privacy consent tracking

### 4. Server Function Tests
- **Feedback Functions** (`server/__tests__/feedback.test.ts`)
  - getFeedbacks with organization/project filtering
  - getFeedbacksFiltered with comprehensive filter options
  - createFeedback with authorization checks
  - updateFeedbackStatus with access verification
  - Database error handling
  - Concurrent update handling

- **Organization Functions** (`server/__tests__/organization.test.ts`)
  - createOrganization with slug uniqueness check
  - getUserOrganizations with role mapping
  - getOrganizationWithProjects with membership verification
  - getUserRoleInOrganization
  - updateOrganizationWebhook with admin-only access
  - Webhook URL validation

### 5. Schema Validation Tests
- **Data Schemas** (`__tests__/schema-validation.test.ts`)
  - Feedback schema (types, status, priority, metadata)
  - User schema (consent timestamps, nullable fields)
  - Metadata schema (nested objects, string keys)
  - All enum values validation

## Running Tests

```bash
# Run all tests
cd apps/web
pnpm test

# Run with coverage report
pnpm test --coverage

# Run in watch mode (for development)
pnpm test --watch

# Run specific test file
pnpm test DataTable

# Run tests matching pattern
pnpm test auth
```

## Test Structure

Each test file follows this structure:
1. **Imports and Mocks**: Set up mocked dependencies
2. **Test Suites**: Group related tests with `describe`
3. **Test Cases**: Individual test cases with `it`
4. **Assertions**: Use `expect` for validations

## Best Practices

### Mocking
- Mock external dependencies at the top of test files
- Use `vi.mock()` for module mocking
- Clear mocks in `beforeEach()` hooks

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names that explain expected behavior
- Test happy paths, edge cases, and error conditions

### Assertions
- Use specific matchers (`toBe`, `toEqual`, `toHaveBeenCalledWith`)
- Test both success and failure scenarios
- Verify error messages and status codes

### Coverage Goals
- Aim for >80% code coverage
- Focus on critical paths and security features
- Don't test implementation details, test behavior

## Security Testing

Key security features tested:
1. **SSRF Protection**: Webhook URLs validated against internal IPs
2. **Rate Limiting**: Prevents abuse with 10 req/min per IP
3. **Origin Validation**: CORS properly configured
4. **Authorization**: All server functions verify permissions
5. **Input Validation**: Email format, message length, required fields
6. **API Key Format**: Strict validation of `sk_live_` prefix

## Key Changes Tested

This test suite covers the following security improvements from the PR:
- Email is now required for feedback (privacy consent)
- Privacy consent timestamps tracked
- Authorization helpers centralized
- SSRF protection for webhooks
- Dynamic CORS headers based on allowed origins
- Session-based user ID extraction (no client-side userId)

## Continuous Integration

Tests should be run:
- Before committing code
- In CI/CD pipeline on pull requests
- Before deploying to production
- After dependency updates

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `pnpm install`
- Check that path aliases in `vitest.config.ts` are correct

### Tests timing out
- Check for missing `await` in async tests
- Verify mocks are properly configured
- Increase timeout if testing slow operations

### Coverage not generated
- Ensure `@vitest/coverage-v8` is installed
- Check `vitest.config.ts` coverage configuration

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure tests cover happy paths and edge cases
3. Update this README if adding new test categories
4. Maintain >80% coverage on changed files