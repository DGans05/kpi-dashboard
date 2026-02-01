# Registration Feature

## Overview
Added user registration functionality to the KPI Dashboard. Users can now create their own accounts via the `/register` page.

## Changes Made

### Frontend

1. **New Register Page** (`frontend/app/register/page.tsx`)
   - Form with username, email, password, and confirm password fields
   - Client-side validation using Zod schema
   - Password matching validation
   - Link to login page
   - Theme toggle support
   - Redirects to login page after successful registration

2. **Updated Login Page** (`frontend/app/login/page.tsx`)
   - Added "Create account" link that navigates to `/register`
   - Replaced admin instruction text with registration link

3. **Updated Auth API** (`frontend/lib/api/auth.ts`)
   - Added `register()` function
   - Added `RegisterResponse` interface
   - Sends username, email, password, and passwordConfirm to backend

### Backend

1. **Updated Auth Controller** (`backend/src/controllers/auth.controller.ts`)
   - Modified `register()` method to accept `username` field
   - Added username validation (minimum 3 characters)
   - Passes username to service layer as `fullName`

2. **Updated Auth Service** (`backend/src/services/auth.service.ts`)
   - Modified `createUser()` method to accept optional `fullName` parameter
   - Updated SQL INSERT to include `full_name` column
   - Returns `fullName` in user response

3. **Updated Auth Routes** (`backend/src/routes/auth.routes.ts`)
   - Updated route documentation to include username field

## API Endpoint

### POST /api/auth/register

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "passwordConfirm": "password123"
}
```

**Success Response (201):**
```json
{
  "message": "Registration successful. Please log in.",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "fullName": "johndoe",
    "role": "viewer",
    "restaurantId": null,
    "isActive": true,
    "createdAt": "2026-01-31T10:56:56.729Z"
  }
}
```

**Error Responses:**
- `400` - Validation failed (missing fields, weak password, passwords don't match)
- `409` - Email already registered
- `500` - Server error

## Validation Rules

### Username
- Required
- Minimum 3 characters

### Email
- Required
- Must be valid email format
- Must be unique (not already registered)
- Automatically converted to lowercase

### Password
- Required
- Minimum 6 characters
- Must meet strength requirements (validated by backend)
- Must match passwordConfirm

## User Flow

1. User visits `http://localhost:3000` → redirects to `/login`
2. User clicks "Create account" link
3. User fills out registration form with username, email, password
4. User submits form
5. Frontend validates inputs
6. Backend validates inputs and password strength
7. Backend creates user with role "viewer" by default
8. Username is saved as `full_name` in database
9. User is redirected to `/login` with success message
10. User can now log in with their email and password

## Testing

### Test Registration via API
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "password123",
    "passwordConfirm": "password123"
  }'
```

### Test Login with New Account
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123"
  }'
```

## URLs

- **Login Page:** http://localhost:3000/login
- **Register Page:** http://localhost:3000/register
- **Register API:** http://localhost:4000/api/auth/register

## Notes

- New users are created with role "viewer" by default
- Admin role required to change user roles
- Username is stored in the `full_name` database column
- If no username provided to service layer, email prefix is used as fallback
- Registration requires both password and passwordConfirm to match
- All services are healthy and operational
