# 2026-04-10 Permission System Design

## Goal
Establish a production-ready, reusable role-based access control (RBAC) system for the group trip planner using Firestore Security Rules. This system will prevent "Missing or insufficient permissions" errors by ensuring the frontend data matches the backend schema and that roles are consistently enforced across all features.

## Architecture
We will use a centralized, resource-centric validation strategy. Every write operation in Firestore will be gated by both a **Role Check** (Who is doing it?) and a **Schema Check** (What are they sending?).

### 1. Permission Matrix
| Feature | Owner | Editor | Viewer |
| :--- | :---: | :---: | :---: |
| **Delete Trip** | ✅ | ❌ | ❌ |
| **Manage Members (Add/Remove/Roles)** | ✅ | ❌ | ❌ |
| **Update Trip Name/Description/Dates** | ✅ | ✅ | ❌ |
| **Create/Update/Delete Expenses** | ✅ | ✅ | ❌ |
| **Create/Update/Delete Timeline Events** | ✅ | ✅ | ❌ |
| **Create/Update/Delete Ideas** | ✅ | ✅ | ❌ |
| **Log Activity** | ✅ | ✅ | ❌ |
| **Read All Trip Data** | ✅ | ✅ | ✅ |

### 2. Firestore Security Rules
We will define reusable helper functions to keep the rules DRY (Don't Repeat Yourself) and easy to maintain.

#### **Role Helpers**
- `getRole(tripId)`: Retrieves the user's role from the trip's `members` map.
- `isOwner(tripId)`: Checks if the user's role is `owner`.
- `canEdit(tripId)`: Checks if the user's role is `owner` or `editor`.
- `canView(tripId)`: Checks if the user is in the `members` map with any valid role.

#### **Validation Helpers**
- `hasOnly(fields)`: Ensures the incoming document only contains allowed fields.
- `isUnchanged(fields)`: Ensures specific fields (like `tripId`, `createdBy`) cannot be modified after creation.

### 3. Entity Schemas
Each sub-collection will have a dedicated validation function:
- `isValidTrip(data)`
- `isValidExpense(data)`
- `isValidTimelineEvent(data)`
- `isValidIdea(data)`
- `isValidActivity(data)`

## Data Flow
1.  **Frontend**: The React application will use a central `usePermissions` hook (or equivalent logic in `TripDetail.tsx`) to disable/enable UI elements based on the user's role in `trip.members`.
2.  **Firestore**: Every write will be strictly validated against its schema. If a field is added to the frontend, it **must** be added to the rules, or the write will fail.

## Implementation Strategy
1.  **Refactor Rules**: Update `firestore.rules` with the new helper functions and schema validators.
2.  **Deploy Rules**: Run `firebase deploy --only firestore:rules`.
3.  **Sync Services**: Audit `src/services/` to ensure the data being sent exactly matches the allowed fields in the rules.
4.  **Verify**: Test each role (Owner, Editor, Viewer) against each action to confirm the permission matrix is correctly enforced.

## Error Handling
- Use the existing `handleFirestoreError` in `src/lib/firestoreError.ts` to provide clear feedback when a permission is denied.
- Log specific "Schema Mismatch" warnings during development if a write fails due to `hasOnly()` checks.
