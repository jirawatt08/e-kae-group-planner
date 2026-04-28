import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-comprehensive-rules',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => await testEnv.cleanup());
beforeEach(async () => await testEnv.clearFirestore());

describe('Comprehensive Trip Rules - Legacy & Edge Cases', () => {
  const ownerId = 'user_owner';
  const tripId = 'trip_legacy';

  it('SHOULD allow update if trip is missing ownerId but user is owner in members map', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', tripId), {
        name: 'Legacy Trip (No ownerId)',
        members: { [ownerId]: 'owner' }
        // Missing ownerId, createdAt, etc.
      });
    });

    const db = testEnv.authenticatedContext(ownerId).firestore();
    await assertSucceeds(updateDoc(doc(db, 'trips', tripId), {
      isJoinEnabled: true,
      updatedAt: serverTimestamp()
    }));
  });

  it('SHOULD allow update if trip has ownerId but user is NOT in members map', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', tripId), {
        name: 'Legacy Trip (Owner not in map)',
        ownerId: ownerId,
        members: { 'someone_else': 'editor' }
      });
    });

    const db = testEnv.authenticatedContext(ownerId).firestore();
    await assertSucceeds(updateDoc(doc(db, 'trips', tripId), {
      isJoinEnabled: true,
      updatedAt: serverTimestamp()
    }));
  });

  it('SHOULD allow update if trip is missing createdAt entirely', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', tripId), {
        name: 'Legacy Trip (No createdAt)',
        ownerId: ownerId,
        members: { [ownerId]: 'owner' }
      });
    });

    const db = testEnv.authenticatedContext(ownerId).firestore();
    await assertSucceeds(updateDoc(doc(db, 'trips', tripId), {
      isJoinEnabled: false,
      updatedAt: serverTimestamp()
    }));
  });

  it('SHOULD allow owner to set inviteCode and lastCodeGeneratedAt if they were missing', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', tripId), {
        name: 'Legacy Trip (No code fields)',
        ownerId: ownerId,
        members: { [ownerId]: 'owner' },
        isJoinEnabled: false
      });
    });

    const db = testEnv.authenticatedContext(ownerId).firestore();
    await assertSucceeds(updateDoc(doc(db, 'trips', tripId), {
      isJoinEnabled: true,
      inviteCode: 'NEWCODE',
      lastCodeGeneratedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
  });

  it('SHOULD deny owner if they try to hijack ownerId', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', tripId), {
        name: 'Trip',
        ownerId: ownerId,
        members: { [ownerId]: 'owner' }
      });
    });

    const db = testEnv.authenticatedContext(ownerId).firestore();
    await assertFails(updateDoc(doc(db, 'trips', tripId), {
      ownerId: 'hacker_id'
    }));
  });

  it('SHOULD deny owner if they try to change createdAt', async () => {
    const originalDate = new Date(2020, 1, 1);
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', tripId), {
        name: 'Trip',
        ownerId: ownerId,
        members: { [ownerId]: 'owner' },
        createdAt: originalDate
      });
    });

    const db = testEnv.authenticatedContext(ownerId).firestore();
    await assertFails(updateDoc(doc(db, 'trips', tripId), {
      createdAt: serverTimestamp()
    }));
  });
});
