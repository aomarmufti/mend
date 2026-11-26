# Investor demo: what is ready and what only you can do

Ready in code: all 14 exercises have a camera coach, the Safari/iPhone tracker
(MoveNet), the iOS shell, privacy policy (`/privacy`), Settings with "Delete all
my data" (`/settings`), and CI (type-check, lint, tests).

Only you can do (needs your Apple account and a Mac with Xcode):

1. Deploy the web app to a public production domain (the iOS shell loads it).
2. Enrol in the Apple Developer Program ($99/yr) if not already.
3. Follow `docs/ios-app.md`: run on your own iPhone first, then Archive and upload to TestFlight.
4. TestFlight internal testing needs no Apple review and installs in minutes.
   A public App Store release goes through App Review, which usually takes
   1-3 days and is not guaranteed, so do not plan to demo from the store listing.
   Demo from TestFlight.
5. Before the demo, test the coach on a real iPhone (MoveNet on Safari/iOS has
   not been tried on a device yet).
