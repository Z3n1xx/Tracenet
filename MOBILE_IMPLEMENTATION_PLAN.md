# TraceNet Mobile Implementation Plan (`tracenet-mobile`)
**Project:** TraceNet Citizen Mobile Application (React Native + Expo SDK 57 + MapLibre + Firebase `tracenet-cebu` + Cloudinary)  
**Target Directory:** `C:\Users\Admin\Desktop\Kyth Code\tracenet-mobile`  
**Manuscript Alignment:** *TraceNet Capstone II Manuscript FINAL.pdf* — Citizen Workflows (Figs 3.1–3.2, pp. 49–50), Citizen Mobile UI Screens (Figs 10–22, pp. 72–84), Citizen Storyboard (Fig 29, p. 92), and Citizen Integration Test Cases (`IT-C1`–`IT-C10`, pp. 128–130).

---

## Phase 1: Citizen Auth, Barangay Directory & Profile / Hotlines
**Manuscript Coverage:** Figures 11–14 (pp. 73–76), Figure 22 (p. 84), Workflow Figure 3.2 (p. 50), `IT-C1`–`IT-C2`
- `constants/barangays.js` (New): 80 Cebu City Barangays, centroid coordinates, Haversine distance calculator, and barangay inference (matching Web `lib/geo.js`).
- `app/(auth)/forgot-password.js` (New) & `app/(auth)/login.js`: Step 1 (Forgot Password email/phone input + Firebase `sendPasswordResetEmail`) and Step 2 (6-Digit OTP verification boxes + New Password reset) matching Figures 13 & 14.
- `app/(auth)/register.js`: Add searchable Barangay of Residence picker (Figure 12) and store `barangay` in Firestore `users/{uid}`.
- `app/profile.js`, `app/(tabs)/profile.js` & `app/(tabs)/_layout.js`: Add Barangay of Residence, Notification Preferences toggles, Cebu City Emergency Hotlines (`CCPO`, `911 / 166`, `Barangay Desk`, `DSWD`) with one-tap `tel:` dialer, Reporting Safety Tips (Figure 22 & Workflow Fig 3.2), and 5th `Profile` tab in the bottom bar.

## Phase 2: 80/20 Multimodal AI Matching Engine & Match Alert UI
**Manuscript Coverage:** Objective 2 (p. 13, p. 38), Figure 17 (p. 79), `IT-C8`–`IT-C10`
- `services/aiService.js`: Implement 80% Facial Similarity + 20% NLP Text Description weighted matcher (`Overall = 0.80 * Face + 0.20 * Text`) with `runAutoMatchForReport()` that scans existing reports and creates `matches` documents in Firestore (`confidence`, `facialScore`, `textScore`, `matchedAttributes`, `fiswgTier`).
- `app/match-alert.js`: Upgrade Figure 17 to display separate Facial (80%) and Text (20%) similarity bars, Overall 80/20 Confidence score, matched attribute pills, Confirm/Review actions, and RA 10173 notice.
- `app/(tabs)/alerts.js`: Surface pending AI Match Alerts at the top of the Alerts screen (`IT-C8`).

## Phase 3: Location-Based Case Coordination — Map Pin-Drop & Nearby Filter
**Manuscript Coverage:** Objective 3 (p. 13), Figures 16, 20, 21 (pp. 78, 82–83), `IT-C3`, `IT-C4`, `IT-C6`, `IT-C7`
- `app/(tabs)/report.js`: Add Barangay selector, Date/Time Last Seen, Circumstances, and interactive "Pin Location on Map" modal (`@maplibre/maplibre-react-native` + OpenStreetMap) to capture exact `latitude` and `longitude`, plus auto-triggering `runAutoMatchForReport()` on submit.
- `app/(tabs)/map.js`: Add Nearby Radius Filter (`1 km`, `3 km`, `5 km`, `10 km`, `All`), Haversine distance badges on pin callouts, "View Case Status" link, and Hotspot Barangay indicators.

## Phase 4: Case Lifecycle — Filter Tabs, Edit/Cancel Report & CCPO Escalation
**Manuscript Coverage:** Figures 18 & 19 (pp. 80–81), Workflow Figure 3.1 (p. 49), `IT-C5`, `IT-C9`
- `app/(tabs)/cases.js`: Add `All`, `Active`, `Resolved` filter tabs (Figure 19) and `My Reports` / `Citywide` toggle.
- `app/case-status.js`: Add Edit Report Details modal, Withdraw/Cancel Report with Reason modal, and Escalate to CCPO Directly button (`IT-C5`).

