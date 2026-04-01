# Implementation Plan: She Shield AI

## Overview

Build a hackathon-winning single-page women safety web app using only Bootstrap 5 + Bootstrap Icons. Three files: `index.html`, `style.css`, `script.js`. The SOS section is the dominant visual anchor. All UI feedback flows through a reusable Toast system.

## Tasks

- [x] 1. Scaffold index.html with CDN links and section skeletons
  - Create `index.html` with Bootstrap 5 CSS/JS CDN and Bootstrap Icons CDN in `<head>`
  - Add `<link rel="stylesheet" href="style.css">` and `<script src="script.js" defer>` tags
  - Add empty `<section>` elements with IDs: `#home`, `#features`, `#stats`, `#sos`, `#contacts`, `#voice`, `#fakecall`, `#tips`, `#about`, `#footer`
  - Add Bootstrap modal markup for `#fakeCallModal` (caller name, Accept/Reject buttons)
  - Add Bootstrap toast container `#toast-container` fixed to bottom-end
  - _Requirements: 12.2, 12.3_

- [x] 2. Build the CSS design system in style.css
  - [x] 2.1 Define CSS custom properties and global resets
    - Declare all color variables (`--color-primary`, `--color-sos-bg`, `--color-sos-button`, etc.)
    - Declare gradient variables (`--gradient-hero`, `--gradient-sos`, `--gradient-card`, `--gradient-stats`)
    - Declare shadow variables (`--shadow-card`, `--shadow-card-hover`, `--shadow-nav`)
    - Declare typography scale using `clamp()` for fluid sizing
    - Add `html { scroll-behavior: smooth; }` and `box-sizing: border-box` reset
    - _Requirements: 12.1, 12.4_

  - [x] 2.2 Implement glassmorphism card base class and hover animations
    - Write `.glass-card` with `background: var(--gradient-card)`, `backdrop-filter: blur(12px)`, pink border, border-radius 16px, and `var(--shadow-card)`
    - Add `.glass-card:hover` rule: `transform: translateY(-6px) scale(1.02)`, `var(--shadow-card-hover)`
    - Write `.btn-primary-custom` hover lift: `translateY(-2px)`, pink box-shadow
    - Write `.nav-link-custom::after` underline slide-in animation using `scaleX` transition
    - _Requirements: 3.10, 12.1_

  - [x] 2.3 Write SOS pulse and ring CSS animations
    - Define `@keyframes sosPulse` expanding box-shadow from 0 to 40px opacity fade
    - Define `@keyframes sosRing` scale from 1 to 2.2 with opacity fade
    - Apply `.sos-btn { animation: sosPulse 1.8s infinite; }` and `.sos-ring` with staggered `animation-delay` for rings 2 and 3
    - Size `.sos-btn` to 120px on desktop, 96px on mobile via media query
    - _Requirements: 4.1, 12.6_

- [x] 3. Implement the Navigation Bar
  - Add Bootstrap `navbar navbar-expand-md` markup inside `#navbar` with `fixed-top` and `backdrop-filter: blur(12px)` via custom CSS class
  - Add brand text "She Shield AI" with pink accent color
  - Add nav links: Home, Features, Emergency Contacts, Safety Tips, About — each with `href="#<sectionId>"` and `.nav-link-custom` class
  - Add Bootstrap hamburger toggler for collapse below 768px
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Implement the Hero Section
  - Fill `#home` with full-viewport-height div using `--gradient-hero` background
  - Add `<h1>` "She Shield AI" using `--text-hero-title` font size (clamp 2.5rem–4rem, weight 800)
  - Add `<p>` tagline "Your Smart Safety Companion" and a short description paragraph
  - Add "Get Started" outline button (`href="#features"`) and "Trigger SOS" filled red button (`href="#sos"`)
  - Apply hover lift styles to both CTA buttons via `.btn-primary-custom`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Implement the Features Section
  - Fill `#features` with a `row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4` Bootstrap grid
  - Create exactly 6 `.glass-card` feature cards with Bootstrap Icons and titles: One Tap SOS Alert (`bi-shield-fill-exclamation`), Live Location Sharing (`bi-geo-alt-fill`), Voice Activated Emergency Trigger (`bi-mic-fill`), Fake Call Escape Feature (`bi-telephone-inbound-fill`), Emergency Contacts Storage (`bi-person-lines-fill`), Safety Tips Assistant (`bi-lightbulb-fill`)
  - Each card includes icon, title, and a one-sentence summary
  - Hover scale+shadow is inherited from `.glass-card` CSS
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 6. Implement the Stats / Counters Section
  - Fill `#stats` with `--gradient-stats` background and 3 stat cards in a Bootstrap `row-cols-1 row-cols-sm-3` grid
  - Each card has a `<span>` with IDs `stat-users`, `stat-alerts`, `stat-cities` and a label below
  - In `script.js`, write `initCounters()` using `IntersectionObserver` — when section enters viewport, call `animateCounter(el, target)` which increments from 0 to target using `requestAnimationFrame`
  - Targets: 12500 (Users Protected), 3200 (SOS Alerts Sent), 48 (Cities Covered)
  - After animation completes, DOM value must equal exactly the target integer
  - _Requirements: 9.1, 9.2_

  - [ ]* 6.1 Write property test for counter animation (Property 9)
    - **Property 9: Counter Animates to Exact Target Value**
    - **Validates: Requirements 9.2**
    - Use `fc.integer({ min: 1, max: 1000000 })` to generate arbitrary targets
    - Assert that after `animateCounter` completes, the element's `textContent` equals the target

- [x] 7. Implement the SOS Emergency Section
  - Fill `#sos` with `--gradient-sos` radial background (near-black crimson)
  - Add section heading and subtitle in light/white text
  - Add `.sos-btn` circular red button (120px) with label "SOS" and 3 `.sos-ring` sibling divs for pulse rings
  - Add `#sos-coords` monospace `<p>` element, initially hidden via `d-none`
  - In `script.js`, write `initSos()` binding click on `#sos-btn` to `triggerSos()`
  - `triggerSos()`: show Bootstrap spinner on button → call `navigator.geolocation.getCurrentPosition()` → on success: display coords in `#sos-coords`, POST JSON `{ latitude, longitude, timestamp, appId }` to `https://example.execute-api.region.amazonaws.com/prod/sos` → in `finally`: call `showToast('Emergency alert sent successfully')` and `resetSosButton()`
  - On geolocation `PERMISSION_DENIED`: call `showToast('Location access is required...')` and `resetSosButton()`
  - Network errors caught and logged to `console.error`; success Toast shown regardless (demo mode)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 7.1 Write property test for geolocation capture and display (Property 1)
    - **Property 1: Geolocation Capture and Display**
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - Use `fc.float({ min: -90, max: 90 })` and `fc.float({ min: -180, max: 180 })`
    - Mock `navigator.geolocation.getCurrentPosition`, call `triggerSos()`, assert `#sos-coords` contains both values

  - [ ]* 7.2 Write property test for SOS POST payload (Property 2)
    - **Property 2: SOS POST Payload Contains Coordinates**
    - **Validates: Requirements 4.5**
    - Use same lat/lng arbitraries; mock `fetch`, assert POST body contains matching `latitude` and `longitude` fields

  - [ ]* 7.3 Write property test for Toast on any feedback event (Property 3)
    - **Property 3: Toast Shown for Any Feedback Event**
    - **Validates: Requirements 4.7, 4.8, 4.9, 7.4, 12.7**
    - Use `fc.constantFrom('sos-sent', 'geo-denied', 'network-error', 'contact-saved', 'contact-deleted', 'call-accepted')`
    - Assert `showToast` is called (spy) for each event type

- [x] 8. Implement the Emergency Contacts Section
  - Fill `#contacts` with a Bootstrap form containing inputs for Contact Name, Relationship, Phone Number, and a Submit button
  - Add `#contacts-list` container below the form for rendered contact cards
  - In `script.js`, write `initContacts()`: load contacts from `localStorage` key `sheShieldContacts` and call `renderContacts()`
  - `saveContact(name, relationship, phone)`: validate all fields non-empty/non-whitespace; if invalid, add `.was-validated` to form and call `showToast` with error; if valid, generate UUID via `crypto.randomUUID()`, push to array, write to `localStorage`, call `renderContacts()`, call `showToast('Contact saved successfully')`
  - `renderContacts()`: clear `#contacts-list`, iterate stored contacts, create `.glass-card` for each with name, relationship, phone, and a `bi-trash3-fill` delete button
  - `deleteContact(id)`: filter contact from array, write back to `localStorage`, call `renderContacts()`, call `showToast('Contact deleted')`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 8.1 Write property test for valid contact save round-trip (Property 4)
    - **Property 4: Valid Contact Save Round-Trip**
    - **Validates: Requirements 5.2, 5.3**
    - Use `fc.record({ name: fc.string({ minLength: 1, maxLength: 50 }), relationship: fc.string({ minLength: 1 }), phone: fc.string({ minLength: 1 }) })`
    - Assert localStorage contains the contact and DOM renders a card with matching name/phone

  - [ ]* 8.2 Write property test for contact load round-trip (Property 5)
    - **Property 5: Contact Load Round-Trip**
    - **Validates: Requirements 5.4**
    - Use `fc.array(contactArb, { minLength: 0, maxLength: 20 })`
    - Pre-populate `localStorage`, call `initContacts()`, assert DOM card count equals array length with no duplicates

  - [ ]* 8.3 Write property test for contact delete (Property 6)
    - **Property 6: Contact Delete Removes from Storage and DOM**
    - **Validates: Requirements 5.5**
    - Use `fc.array(contactArb, { minLength: 1 })`, pick a random contact, call `deleteContact(id)`, assert it is absent from both localStorage and DOM

  - [ ]* 8.4 Write property test for empty field validation (Property 7)
    - **Property 7: Empty Field Validation Prevents Save**
    - **Validates: Requirements 5.6**
    - Use `fc.record` with at least one field forced to empty string
    - Assert localStorage contact count is unchanged after attempted save

- [ ] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement the Voice Trigger Section
  - Fill `#voice` with a "Start Voice Detection" button (`#start-voice-btn`) and a mic status indicator `#mic-indicator` (hidden by default)
  - In `script.js`, write `initVoice()`: check `window.SpeechRecognition || window.webkitSpeechRecognition`; if absent, disable `#start-voice-btn` and show static unsupported message
  - `startListening()`: instantiate `SpeechRecognition`, set `continuous: true`, `interimResults: true`; on `onresult` check transcript (lowercased) for keywords `"help"`, `"save me"`, `"emergency"`; if found, call `triggerSos()`
  - While listening: toggle button to pink/active state and show pulsing `#mic-indicator`
  - On `onend`: hide mic indicator, reset button state
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 10.1 Write property test for keyword detection (Property 8)
    - **Property 8: Any Trigger Keyword Activates SOS Flow**
    - **Validates: Requirements 6.3**
    - Use `fc.constantFrom("help", "save me", "emergency")`
    - Mock `SpeechRecognition` result event with the keyword, assert `triggerSos` is called (spy)

- [x] 11. Implement the Fake Call Section
  - Fill `#fakecall` with an "Incoming Fake Call" button that triggers `#fakeCallModal`
  - Ensure modal markup (from task 1) shows "Mom Calling…" heading, animated phone ring icon (`bi-telephone-fill`), Accept and Reject buttons
  - In `script.js`, write `initFakeCall()`: bind modal `show.bs.modal` event to `playRingtone()`; bind Accept button to `stopRingtone()`, close modal, and `showToast('Call accepted')`; bind Reject button to `stopRingtone()` and close modal
  - `playRingtone()`: create `AudioContext`, create `OscillatorNode` (type `sine`, frequency 440Hz), connect to destination, start; wrap in try/catch for unsupported browsers
  - `stopRingtone()`: stop and disconnect oscillator if active
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 12. Implement the Safety Tips Section
  - Fill `#tips` with a `row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4` grid of at least 6 `.glass-card` tip cards
  - Each card must include a `<i class="bi bi-*">` Bootstrap Icon element, a tip title, and a short description
  - Suggested icons: `bi-eye-fill`, `bi-phone-fill`, `bi-people-fill`, `bi-map-fill`, `bi-lock-fill`, `bi-bell-fill`
  - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 12.1 Write property test for tip card icon presence (Property 11)
    - **Property 11: Each Safety Tip Card Contains an Icon Element**
    - **Validates: Requirements 8.2**
    - Use `fc.integer({ min: 0, max: tipCount - 1 })` to pick a card by index
    - Assert the card's DOM subtree contains an element matching `[class*="bi-"]`

- [x] 13. Implement the AWS Architecture Section
  - Fill `#about` with a section heading and a horizontally scrollable row of 5 `.glass-card` architecture cards
  - Cards in order: S3 (frontend hosting), API Gateway (routing), Lambda (business logic), SNS (alerts), DynamoDB (event log)
  - Each card has a Bootstrap Icon, service name as heading, and one-line description
  - Place a `→` arrow character between cards (visible on md+ viewports)
  - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 13.1 Write property test for AWS service references (Property 10)
    - **Property 10: All Required AWS Services Referenced**
    - **Validates: Requirements 10.2**
    - Use `fc.constantFrom("S3", "API Gateway", "Lambda", "SNS", "DynamoDB")`
    - Assert `document.getElementById('about').textContent` contains each service name

- [x] 14. Implement the Footer
  - Fill `#footer` with dark background, centered college innovation challenge info, copyright notice, and a row of social Bootstrap Icons: `bi-github`, `bi-linkedin`, `bi-twitter-x`, `bi-instagram`
  - Each icon links to `#` placeholder
  - _Requirements: 11.1, 11.2_

- [x] 15. Implement the Toast notification utility
  - In `script.js`, write `showToast(message)` that programmatically creates a Bootstrap toast element, appends it to `#toast-container`, initializes `bootstrap.Toast`, and calls `.show()`
  - Toast auto-hides after 4 seconds; remove element from DOM on `hidden.bs.toast` event
  - Ensure `showToast` is called from: SOS success, geolocation denied, contact saved, contact deleted, call accepted
  - _Requirements: 12.7, 4.7, 4.8, 5.2, 5.5, 7.4_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** (`fc`) with `fc.configureGlobal({ numRuns: 100 })`
- Each property test file must include the comment `// Feature: she-shield-ai, Property N: <property_text>`
- All JS modules live in a single `script.js` wrapped in a `DOMContentLoaded` listener
- No build step, no npm — open `index.html` directly in a browser to run the app
