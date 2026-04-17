import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Load rules
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
  
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test-permissions',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Trip Permission Rules', () => {
  it('should allow the owner to toggle the join code', async () => {
    // Setup initial data unconditionally using admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', 'trip_1'), {
        name: 'Test Trip',
        ownerId: 'user_owner',
        isJoinEnabled: true,
        members: {
          'user_owner': 'owner'
        }
      });
    });

    // Run test as owner
    const ownerDb = testEnv.authenticatedContext('user_owner').firestore();
    const tripRef = doc(ownerDb, 'trips', 'trip_1');
    
    // Toggling join code
    await assertSucceeds(updateDoc(tripRef, {
      isJoinEnabled: false
    }));
  });

  it('should deny non-members from toggling the join code', async () => {
    // Setup initial data unconditionally using admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', 'trip_1'), {
        name: 'Test Trip',
        ownerId: 'user_owner',
        isJoinEnabled: true,
        members: {
          'user_owner': 'owner'
        }
      });
    });

    // Run test as random user
    const randomDb = testEnv.authenticatedContext('user_random').firestore();
    const tripRef = doc(randomDb, 'trips', 'trip_1');
    
    // Toggling join code should fail
    await assertFails(updateDoc(tripRef, {
      isJoinEnabled: false
    }));
  });

  it('should allow a non-member to join when isJoinEnabled is true and code is fresh', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      // Fresh code generated 5 minutes ago
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      await setDoc(doc(db, 'trips', 'trip_join'), {
        name: 'Joinable Trip',
        ownerId: 'user_owner',
        inviteCode: 'AABBCC',
        isJoinEnabled: true,
        lastCodeGeneratedAt: fiveMinsAgo,
        createdAt: new Date(),
        members: {
          'user_owner': 'owner'
        }
      });
    });

    const newMemberDb = testEnv.authenticatedContext('user_new').firestore();
    const tripRef = doc(newMemberDb, 'trips', 'trip_join');
    
    // Joining as editor should succeed
    await assertSucceeds(updateDoc(tripRef, {
      'members.user_new': 'editor'
    }));
  });

  it('should deny a non-member to join if the code is expired (>30 mins)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      // Code generated 35 minutes ago
      const thirtyFiveMinsAgo = new Date(Date.now() - 35 * 60 * 1000);
      await setDoc(doc(db, 'trips', 'trip_expired'), {
        name: 'Expired Trip',
        ownerId: 'user_owner',
        inviteCode: 'AABBCC',
        isJoinEnabled: true,
        lastCodeGeneratedAt: thirtyFiveMinsAgo,
        createdAt: new Date(),
        members: {
          'user_owner': 'owner'
        }
      });
    });

    const newMemberDb = testEnv.authenticatedContext('user_new').firestore();
    const tripRef = doc(newMemberDb, 'trips', 'trip_expired');
    
    // Joining should fail because of expiration rule
    await assertFails(updateDoc(tripRef, {
      'members.user_new': 'editor'
    }));
  });
});
