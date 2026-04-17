import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test-expenses',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => await testEnv.cleanup());
beforeEach(async () => await testEnv.clearFirestore());

describe('Expense Permission Rules', () => {
  it('should allow an editor to update an expense', async () => {
    // Setup initial trip data unconditionally using admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'trips', 'trip_1'), {
        name: 'Test Trip',
        ownerId: 'user_owner',
        members: { 'user_owner': 'owner', 'user_editor': 'editor' }
      });
      await setDoc(doc(db, 'trips/trip_1/expenses/exp1'), {
        tripId: 'trip_1',
        title: 'Food',
        amount: 1500,
        paidByMap: { 'user_owner': 1500 },
        splitAmong: ['user_owner', 'user_editor'],
        extras: {},
        extraDetails: [],
        guestNames: [],
        splitMode: 'equal',
        exactSplits: {},
        paidStatus: { 'user_editor': false },
        createdBy: 'user_editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const db = testEnv.authenticatedContext('user_editor').firestore();
    
    // Simulate expense payload exactly as updateExpense builds it
    await assertSucceeds(updateDoc(doc(db, 'trips/trip_1/expenses/exp1'), {
      title: 'Food Update',
      amount: 2000,
      paidByMap: { 'user_owner': 2000 },
      splitAmong: ['user_owner', 'user_editor'],
      extras: {},
      extraDetails: [],
      guestNames: [],
      splitMode: 'equal',
      exactSplits: {},
      paidStatus: { 'user_editor': false },
      updatedAt: serverTimestamp(),
    }));
  });
});
