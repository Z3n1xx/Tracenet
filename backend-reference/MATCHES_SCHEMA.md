# `matches` Firestore collection — contract for the AI backend

The mobile app's AI Match Alert screen (`app/match-alert.js`) and Home
screen banner are wired to read from a `matches` collection in the same
`tracenet-cebu` Firestore project the app already uses for `reports` and
`users`. Whatever writes face-match results (the DeepFace comparison
service) should write documents in this exact shape.

No AI dependency to read this doc — it's just the data contract.

## Document shape

Collection: `matches`, auto-generated doc ID.

```js
{
  missingReportId: string,   // reports/{id} where type == 'missing'
  sightingReportId: string,  // reports/{id} where type == 'sighting'
  confidence: number,        // 0-100, face similarity score
  status: 'pending',         // always starts here; see below
  createdAt: Timestamp,      // serverTimestamp() on write
  reviewedAt: null,
  reviewedBy: null,
}
```

- `missingReportId` / `sightingReportId` must be real doc IDs from the
  existing `reports` collection (each report already has `photoUrl`,
  `name`, `location`, `age`, `sex`, `reportedByUid`).
- `confidence` drives the progress bar on the match screen — use 0-100,
  not 0-1.
- Always write `status: 'pending'` on creation. The mobile app updates it
  to `'confirmed'` or `'needs_review'` when a user acts on it (and stamps
  `reviewedAt`/`reviewedBy`); the AI service should never set those.
- Only create a match doc when confidence clears whatever threshold the
  model settles on — don't write low-confidence noise, since every
  pending doc surfaces directly in a user's app as an alert.

## When to write one

Whenever a new `sighting` report is created (or a new `missing` report,
checked against existing sightings) and its face embedding is within
threshold of another report's embedding, create one `matches` doc. One
Firestore listener (`onSnapshot` on `reports`) is the natural trigger
point if the comparison runs in a Python service, or a Firestore-
triggered Cloud Function if it's Node — either works, this contract
doesn't care which.

## Firestore access

Same permissive prototype rule as every other collection right now:
`allow read, write: if request.auth != null;` (see `firestore.rules`).
If the AI service writes via the Admin SDK (service account), it bypasses
these rules entirely, so no auth setup needed on that side.
