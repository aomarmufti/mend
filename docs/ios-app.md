# Reknit on iPhone and iPad

The iOS app is a native shell (Capacitor) that loads the web app, so the camera
coach runs on the same code as the browser. The project is in `ios/`. It was
generated and edited on Linux and has **not been built in Xcode yet**, so expect
to fix small things the first time.

## Why the web app picks a different body tracker there

Safari and every iPhone/iPad web view run Apple's WebKit engine. MediaPipe's
WebAssembly build crashes there (`Out of bounds memory access ... _malloc`), so
on WebKit the coach uses MoveNet through TensorFlow.js instead
(`src/components/coach/movenet.ts`). Chrome and Android keep using MediaPipe.
Overrides: `?engine=movenet|mediapipe`, `?model=lightning`.

## Run it on your own iPhone or iPad (free, no paid account)

You need a Mac with Xcode (free, Mac App Store) and a cable.

1. `npm install`
2. `REKNIT_APP_URL=https://your-live-site npm run ios:open` (opens Xcode).
   The URL must open without a login. A Vercel preview URL may ask for a Vercel
   login inside the app, so use the production domain.
3. In Xcode: Settings > Accounts > add your Apple ID. Click the **App** project >
   Signing & Capabilities > Team: your name (Personal Team). If it says the
   bundle identifier is unavailable, change `uk.co.reknit.app` to something
   unique, such as `uk.co.reknit.app.yourname`.
4. On the phone: plug in, tap Trust. Settings > Privacy & Security > Developer
   Mode > on (it restarts).
5. In Xcode pick your phone at the top and press Run. The first time, on the
   phone: Settings > General > VPN & Device Management > trust your developer
   profile.

A free-account build stops opening after 7 days and needs running again.

## TestFlight and the App Store (needs the paid Developer Program, $99/year)

- Create the app in App Store Connect with the same bundle identifier.
- In Xcode: Product > Archive > Distribute App > App Store Connect.
- Internal testers (your own team) can install from TestFlight without review.
  External testers need a short beta review.
- Before store review: privacy policy URL, App Privacy answers, screenshots, a
  real sign-in (Apple requires Sign in with Apple if you offer Google), and
  remove placeholder price copy. A shell that only shows a website can be
  rejected under Apple's minimum-functionality rule, so bundle the web app
  and add native features before submitting.
