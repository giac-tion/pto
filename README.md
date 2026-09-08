# PTO Tracker

PTO planning and optimization tool hosted on GitHub Pages.

## Data Storage

New events are stored in Cloud Firestore under:

```text
users/{userId}/events/{eventId}
```

Users sign in with Google through Firebase Authentication. Events are loaded and synchronized in real time for that signed-in Google account across devices. Creating, adjusting, or deleting an event writes the change to Firestore immediately after the action is completed.

Each user can access only their own events through the Firestore security rules. The app does not store new events in GitHub or in the repository, and Firebase credentials should not be added to this README.

## Firebase Administration

An administrator can manage the project from the [Firebase Console](https://console.firebase.google.com/):

- **Authentication:** manage Google sign-in and authorized domains.
- **Firestore Database:** inspect event data, configure indexes, and publish security rules.
    - e.g. Giving access to new authorized gmails
- **Project settings:** update the web app configuration used by `index.html`.

After changing the Firebase web configuration, update the `firebaseConfig` object in `index.html`, then commit and push the change so GitHub Pages redeploys the app. Never place service-account private keys or other secret credentials in the repository.
