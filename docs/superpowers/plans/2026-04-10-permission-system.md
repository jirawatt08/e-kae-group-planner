# Permission System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-ready, reusable role-based access control (RBAC) system for the group trip planner.

**Architecture:** Use centralized helper functions in Firestore security rules to enforce owner, editor, and viewer roles. Implement strict schema validation for all writes to prevent data pollution and permission errors.

**Tech Stack:** Firebase (Firestore, Auth), React, TypeScript.

---

### Task 1: Update Firestore Security Rules Helpers

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Replace helper functions with centralized role and schema helpers**

```rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===============================================================
    // Helper Functions
    // ===============================================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getRole(tripId) {
      return get(/databases/$(database)/documents/trips/$(tripId)).data.members[request.auth.uid];
    }
    
    function isOwner(tripId) {
      return isAuthenticated() && getRole(tripId) == 'owner';
    }
    
    function canEdit(tripId) {
      let role = getRole(tripId);
      return isAuthenticated() && (role == 'owner' || role == 'editor');
    }
    
    function canView(tripId) {
      let role = getRole(tripId);
      return isAuthenticated() && (role != null);
    }
    
    function hasOnly(fields) {
      return request.resource.data.keys().hasOnly(fields);
    }
    
    function isUnchanged(fields) {
      return !request.resource.data.diff(resource.data).affectedKeys().hasAny(fields);
    }

    function isValidEmail(email) {
      return email is string && email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
    }

    // ===============================================================
    // Domain Validators
    // ===============================================================
    
    function isValidUser(data) {
      return hasOnly(['uid', 'displayName', 'email', 'photoURL', 'createdAt']) &&
             data.uid is string && data.uid.size() > 0 &&
             data.displayName is string &&
             data.email is string && isValidEmail(data.email) &&
             data.createdAt is timestamp;
    }

    function isValidTrip(data) {
      return hasOnly(['name', 'description', 'startDate', 'endDate', 'ownerId', 'members', 'createdAt', 'updatedAt']) &&
             data.name is string && data.name.size() > 0 &&
             data.ownerId is string &&
             data.members is map &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidTimelineEvent(data) {
      return hasOnly(['tripId', 'title', 'description', 'startTime', 'endTime', 'location', 'mapLink', 'createdBy', 'createdAt', 'updatedAt']) &&
             data.tripId is string &&
             data.title is string && data.title.size() > 0 &&
             data.startTime is timestamp &&
             data.createdBy is string &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidExpense(data) {
      return hasOnly(['tripId', 'title', 'amount', 'paidBy', 'paidByMap', 'splitAmong', 'extras', 'splitMode', 'exactSplits', 'paidStatus', 'createdBy', 'createdAt', 'updatedAt']) &&
             data.tripId is string && 
             data.title is string && data.title.size() > 0 &&
             data.amount is number &&
             data.paidBy is string &&
             data.createdBy is string &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp;
    }

    function isValidIdea(data) {
      return hasOnly(['tripId', 'title', 'description', 'link', 'votes', 'createdBy', 'createdAt']) &&
             data.tripId is string &&
             data.title is string && data.title.size() > 0 &&
             data.votes is list &&
             data.createdBy is string &&
             data.createdAt is timestamp;
    }

    function isValidActivity(data) {
      return hasOnly(['tripId', 'userId', 'userName', 'action', 'details', 'createdAt']) &&
             data.tripId is string &&
             data.userId is string &&
             data.userName is string &&
             data.action is string &&
             data.createdAt is timestamp;
    }
```

- [ ] **Step 2: Update the rules section with the new helpers**

```rules
    // ===============================================================
    // Rules
    // ===============================================================

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == userId && isValidUser(request.resource.data);
      allow update: if isAuthenticated() && request.auth.uid == userId && isValidUser(request.resource.data) && isUnchanged(['uid', 'createdAt']);
    }

    match /trips/{tripId} {
      allow read: if canView(tripId);
      allow create: if isAuthenticated() && isValidTrip(request.resource.data) && 
                    request.resource.data.ownerId == request.auth.uid &&
                    request.resource.data.members[request.auth.uid] == 'owner';
      allow update: if (isOwner(tripId) && isValidTrip(request.resource.data)) ||
                    (canEdit(tripId) && isValidTrip(request.resource.data) && isUnchanged(['ownerId', 'members', 'createdAt']));
      allow delete: if isOwner(tripId);

      match /timeline/{eventId} {
        allow read: if canView(tripId);
        allow create: if canEdit(tripId) && isValidTimelineEvent(request.resource.data) && request.resource.data.tripId == tripId;
        allow update: if canEdit(tripId) && isValidTimelineEvent(request.resource.data) && isUnchanged(['tripId', 'createdBy', 'createdAt']);
        allow delete: if canEdit(tripId);
      }

      match /expenses/{expenseId} {
        allow read: if canView(tripId);
        allow create: if canEdit(tripId) && isValidExpense(request.resource.data) && request.resource.data.tripId == tripId;
        allow update: if canEdit(tripId) && isValidExpense(request.resource.data) && isUnchanged(['tripId', 'createdBy', 'createdAt']);
        allow delete: if canEdit(tripId);
      }

      match /ideas/{ideaId} {
        allow read: if canView(tripId);
        allow create: if canEdit(tripId) && isValidIdea(request.resource.data) && request.resource.data.tripId == tripId;
        allow update: if canEdit(tripId) && isValidIdea(request.resource.data) && isUnchanged(['tripId', 'createdBy', 'createdAt']);
        allow delete: if canEdit(tripId);
      }

      match /activity/{activityId} {
        allow read: if canView(tripId);
        allow create: if canEdit(tripId) && isValidActivity(request.resource.data) && request.resource.data.tripId == tripId;
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "security: update firestore rules with centralized RBAC and strict schemas"
```

---

### Task 2: Sync Expense Service with Strict Schema

**Files:**
- Modify: `src/services/expenseService.ts`

- [ ] **Step 1: Ensure createExpense sends exactly the fields defined in isValidExpense**

```typescript
    const docRef = await addDoc(collection(db, `trips/${tripId}/expenses`), {
      tripId,
      title,
      amount,
      paidBy,
      paidByMap,
      splitAmong,
      extras,
      splitMode,
      exactSplits: {},
      paidStatus,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
```
(Verify if any other fields are being sent and remove them if not in the schema)

- [ ] **Step 2: Ensure updateExpense sends only allowed fields**

```typescript
    const updateData: Record<string, any> = {
      title,
      amount,
      paidByMap,
      extras,
      splitMode,
      updatedAt: serverTimestamp(),
    };
    
    if (paidBy !== '') {
      updateData.paidBy = paidBy;
    }
    // Remove exactSplits if it's empty or unused to keep it clean
```

- [ ] **Step 3: Commit**

```bash
git add src/services/expenseService.ts
git commit -m "refactor: sync expense service with firestore strict schema"
```

---

### Task 3: Sync Activity Service with Strict Schema

**Files:**
- Modify: `src/services/activityService.ts`

- [ ] **Step 1: Update logActivity to match isValidActivity schema**

```typescript
      await addDoc(collection(db, `trips/${tripId}/activity`), {
        tripId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Unknown',
        action,
        details,
        createdAt: serverTimestamp()
      });
```

- [ ] **Step 2: Commit**

```bash
git add src/services/activityService.ts
git commit -m "refactor: sync activity service with firestore strict schema"
```

---

### Task 4: Sync Timeline Service with Strict Schema

**Files:**
- Modify: `src/services/timelineService.ts`

- [ ] **Step 1: Update timelineService to match isValidTimelineEvent schema**

- [ ] **Step 2: Commit**

```bash
git add src/services/timelineService.ts
git commit -m "refactor: sync timeline service with firestore strict schema"
```

---

### Task 5: Sync Idea Service with Strict Schema

**Files:**
- Modify: `src/services/ideaService.ts`

- [ ] **Step 1: Update ideaService to match isValidIdea schema**

- [ ] **Step 2: Commit**

```bash
git add src/services/ideaService.ts
git commit -m "refactor: sync idea service with firestore strict schema"
```

---

### Task 6: Deploy and Verify

- [ ] **Step 1: Deploy Firestore Rules**

Run: `firebase deploy --only firestore:rules`

- [ ] **Step 2: Verify adding an expense**

Try adding a new expense in the UI and confirm it works without permission errors.

- [ ] **Step 3: Verify role enforcement**

Create a "Viewer" user (or manually change a role to 'viewer' in console) and verify they cannot add expenses.
