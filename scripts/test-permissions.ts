/**
 * DIAGNOSTIC SCRIPT: Test Trip Permissions
 * 
 * Usage: npx tsx scripts/test-permissions.ts <TRIP_ID>
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

async function runTest() {
  const tripId = process.argv[2];
  if (!tripId) {
    console.error('Error: Please provide a Trip ID. Usage: npx tsx scripts/test-permissions.ts <TRIP_ID>');
    process.exit(1);
  }

  console.log(`Starting diagnostics for Trip: ${tripId}`);
  console.log('Project ID:', firebaseConfig.projectId);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    console.log('Step 1: Fetching trip document...');
    const tripRef = doc(db, 'trips', tripId);
    const snap = await getDoc(tripRef);
    
    if (!snap.exists()) {
      console.log('❌ Trip not found.');
      return;
    }

    const data = snap.data();
    console.log('✅ Trip found:', data.name);
    console.log('Current ownerId:', data.ownerId);
    console.log('Join Enabled:', data.isJoinEnabled);

    console.log('\nStep 2: Attempting to toggle isJoinEnabled (Testing Update Permission)...');
    console.log('(Note: This will likely fail in a CLI script if you are not signed in, but it validates the schema rule)');
    
    await updateDoc(tripRef, {
      isJoinEnabled: !data.isJoinEnabled,
      updatedAt: serverTimestamp()
    });

    console.log('✅ Permission Check Passed: Successfully updated trip.');
  } catch (error: any) {
    console.error('\n❌ Permission Check Failed!');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('\nPossible causes:');
      console.log('1. You are not signed in as the owner in this environment.');
      console.log('2. The firestore.rules "isOwner" check is failing.');
      console.log('3. The "isValidTrip" schema check is failing due to unknown fields.');
    }
  }
}

runTest();
