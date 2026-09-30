// Reference implementation for the mobile team's teammate managing the
// backend/web portal — NOT part of the Expo app build, not deployed from
// here. This is the missing piece for background push notifications:
// notifying a user when their report's status changes while the app is
// closed.
//
// The mobile app already:
//   - saves each user's FCM device token to Firestore at users/{uid}.pushToken
//     (see services/notifications.js -> registerPushToken)
//   - updates reports/{reportId}.status as barangay/CCPO review each report
//
// What's missing is a trigger that runs when `status` changes and actually
// sends the push. That has to live server-side (Cloud Functions), because
// the phone isn't running any code while the app is closed.
//
// Setup (one-time, done by whoever owns Firebase Functions for this project):
//   1. firebase init functions   (Node.js, from the project root or a
//      dedicated backend repo — this file assumes a Functions v2 project)
//   2. npm install firebase-admin firebase-functions
//   3. Copy this file's contents into functions/index.js (or import it from
//      there) and deploy: firebase deploy --only functions
//
// No AI/matching model dependency — this can be deployed any time.

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

const STATUS_MESSAGES = {
  verified: (name) => `Your report for ${name} has been verified by the barangay.`,
  forwarded: (name) => `Your report for ${name} has been forwarded to CCPO.`,
  resolved: (name) => `Your report for ${name} has been resolved.`,
};

exports.sendStatusPush = onDocumentUpdated('reports/{reportId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (before.status === after.status) return;

  const message = STATUS_MESSAGES[after.status];
  if (!message) return;

  const uid = after.reportedByUid;
  if (!uid) return;

  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const pushToken = userSnap.data()?.pushToken;
  if (!pushToken) return;

  await admin.messaging().send({
    token: pushToken,
    notification: {
      title: 'TraceNet Update',
      body: message(after.name || 'Unidentified person'),
    },
  });
});
