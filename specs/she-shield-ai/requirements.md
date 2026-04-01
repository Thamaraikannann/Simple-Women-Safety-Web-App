# Requirements Document

## Introduction

She Shield AI is a modern, responsive, AI-powered women safety and emergency support web application built for a college innovation challenge. The app provides one-tap SOS alerts, live location sharing, voice-activated emergency triggers, fake call escape, emergency contact management, and safety tips — all in a pink-white themed, mobile-first interface. The frontend is structured for seamless backend integration via AWS API Gateway, Lambda, SNS, and DynamoDB.

## Glossary

- **App**: The She Shield AI single-page web application
- **SOS_Button**: The large red emergency trigger button in the SOS section
- **SOS_Alert**: The emergency notification sent to the placeholder API endpoint and displayed to the user
- **Location_Service**: The browser Geolocation API used to capture latitude and longitude
- **Contact_Store**: The localStorage-backed emergency contacts storage
- **Voice_Detector**: The Web Speech API-based keyword detection module
- **Fake_Call_Modal**: The Bootstrap modal simulating an incoming phone call
- **Toast**: A non-blocking Bootstrap toast notification shown to the user
- **API_Endpoint**: The placeholder AWS API Gateway URL `https://example.execute-api.region.amazonaws.com/prod/sos`
- **Safety_Tips_Section**: The section displaying at least 6 safety tips with icons
- **Nav**: The Bootstrap 5 navigation bar at the top of the page

---

## Requirements

### Requirement 1: Navigation Bar

**User Story:** As a user, I want a clear navigation bar, so that I can quickly jump to any section of the app.

#### Acceptance Criteria

1. THE Nav SHALL contain links for Home, Features, Emergency Contacts, Safety Tips, and About.
2. THE Nav SHALL remain fixed at the top of the viewport during scrolling.
3. WHEN a Nav link is clicked, THE App SHALL smooth-scroll to the corresponding section.
4. WHILE the viewport width is below 768px, THE Nav SHALL collapse into a hamburger menu using Bootstrap 5 toggler.

---

### Requirement 2: Hero Section

**User Story:** As a visitor, I want an impactful hero section, so that I immediately understand the app's purpose and can take action.

#### Acceptance Criteria

1. THE App SHALL display the app name "She Shield AI" as the primary heading in the hero section.
2. THE App SHALL display the tagline "Your Smart Safety Companion" beneath the primary heading.
3. THE App SHALL display a short description covering women safety, emergency support, and AI-powered protection.
4. THE App SHALL render a "Get Started" CTA button that smooth-scrolls to the Features section when clicked.
5. THE App SHALL render a "Trigger SOS" CTA button that smooth-scrolls to the SOS Emergency section when clicked.
6. THE App SHALL apply a pink-white gradient background to the hero section.

---

### Requirement 3: Features Section

**User Story:** As a visitor, I want to see all key features at a glance, so that I understand what the app offers.

#### Acceptance Criteria

1. THE App SHALL display a Features section containing exactly six feature cards.
2. THE App SHALL include a card for "One Tap SOS Alert" with a descriptive icon and summary.
3. THE App SHALL include a card for "Live Location Sharing" with a descriptive icon and summary.
4. THE App SHALL include a card for "Voice Activated Emergency Trigger" with a descriptive icon and summary.
5. THE App SHALL include a card for "Fake Call Escape Feature" with a descriptive icon and summary.
6. THE App SHALL include a card for "Emergency Contacts Storage" with a descriptive icon and summary.
7. THE App SHALL include a card for "Safety Tips Assistant" with a descriptive icon and summary.
8. WHILE the viewport width is 768px or above, THE App SHALL display feature cards in a multi-column Bootstrap grid.
9. WHILE the viewport width is below 768px, THE App SHALL display feature cards in a single-column layout.
10. WHEN a feature card is hovered, THE App SHALL apply a visible hover effect such as a shadow or scale transform.

---

### Requirement 4: SOS Emergency Section

**User Story:** As a user in danger, I want to trigger an SOS alert with one tap, so that my location is shared and help is notified immediately.

#### Acceptance Criteria

1. THE App SHALL display a large, prominently styled red SOS button in the SOS Emergency section.
2. WHEN the SOS_Button is clicked, THE Location_Service SHALL request geolocation permission from the browser.
3. WHEN geolocation permission is granted, THE App SHALL capture the user's latitude and longitude.
4. WHEN geolocation coordinates are captured, THE App SHALL display the current latitude and longitude on the page.
5. WHEN geolocation coordinates are captured, THE App SHALL POST a JSON payload containing the coordinates to the API_Endpoint.
6. WHEN the POST request is initiated, THE App SHALL display a loading animation on the SOS_Button.
7. WHEN the POST request completes (success or network failure), THE App SHALL display a Toast notification reading "Emergency alert sent successfully".
8. IF geolocation permission is denied, THEN THE App SHALL display a Toast notification informing the user that location access is required.
9. IF the POST request fails due to a network error, THEN THE App SHALL still display the "Emergency alert sent successfully" Toast to simulate success for demo purposes.

---

### Requirement 5: Emergency Contacts Section

**User Story:** As a user, I want to store and manage emergency contacts, so that the app can notify them during an SOS event.

#### Acceptance Criteria

1. THE App SHALL display a form with fields for Contact Name, Relationship, and Phone Number.
2. WHEN the form is submitted with all fields filled, THE Contact_Store SHALL save the contact to localStorage.
3. WHEN a contact is saved, THE App SHALL display the contact as a Bootstrap card or table row beneath the form.
4. WHEN the page loads, THE App SHALL read all contacts from localStorage and render them in the contacts list.
5. WHEN a delete button on a contact card is clicked, THE Contact_Store SHALL remove that contact from localStorage and THE App SHALL remove the card from the display.
6. IF the form is submitted with one or more empty fields, THEN THE App SHALL display a validation error and SHALL NOT save the contact.

---

### Requirement 6: Voice Trigger Simulation

**User Story:** As a user, I want to trigger an SOS by speaking keywords, so that I can call for help hands-free.

#### Acceptance Criteria

1. THE App SHALL display a "Start Voice Detection" button in the Voice Trigger section.
2. WHEN the "Start Voice Detection" button is clicked and the Web Speech API is available, THE Voice_Detector SHALL begin listening for speech input.
3. WHEN the Voice_Detector detects any of the keywords "help", "save me", or "emergency" in the speech input, THE App SHALL trigger the same SOS flow defined in Requirement 4.
4. WHEN voice detection is active, THE App SHALL display a visual indicator showing that the microphone is listening.
5. IF the Web Speech API is not supported by the browser, THEN THE App SHALL display a message informing the user that voice detection is not supported and SHALL disable the "Start Voice Detection" button.

---

### Requirement 7: Fake Call Feature

**User Story:** As a user in an uncomfortable situation, I want to simulate an incoming call, so that I can excuse myself safely.

#### Acceptance Criteria

1. THE App SHALL display an "Incoming Fake Call" button in the Fake Call section.
2. WHEN the "Incoming Fake Call" button is clicked, THE Fake_Call_Modal SHALL open displaying the caller name "Mom Calling…".
3. THE Fake_Call_Modal SHALL contain an "Accept" button and a "Reject" button.
4. WHEN the "Accept" button is clicked, THE Fake_Call_Modal SHALL close and THE App SHALL display a Toast notification indicating the call was accepted.
5. WHEN the "Reject" button is clicked, THE Fake_Call_Modal SHALL close.
6. WHERE the browser supports the Web Audio API, THE App SHALL play a ringtone sound when the Fake_Call_Modal opens.

---

### Requirement 8: Safety Tips Section

**User Story:** As a user, I want to read safety tips, so that I can be better prepared in potentially dangerous situations.

#### Acceptance Criteria

1. THE Safety_Tips_Section SHALL display a minimum of six safety tips.
2. THE App SHALL display each safety tip with a relevant emoji or Bootstrap Icon.
3. THE App SHALL present safety tips in a responsive grid layout consistent with the overall page design.

---

### Requirement 9: Animated Stats / Counters

**User Story:** As a visitor, I want to see impact statistics, so that I understand the app's reach and importance.

#### Acceptance Criteria

1. THE App SHALL display at least three animated counter statistics (e.g., users protected, SOS alerts sent, cities covered).
2. WHEN the stats section enters the viewport, THE App SHALL animate each counter from zero to its target value.

---

### Requirement 10: About / AWS Architecture Section

**User Story:** As a judge or evaluator, I want to see the technical architecture, so that I can assess the app's scalability and cloud integration.

#### Acceptance Criteria

1. THE App SHALL display an About section describing the AWS architecture used.
2. THE App SHALL reference the following AWS services: S3 (frontend hosting), API Gateway, Lambda, SNS, and DynamoDB.
3. THE App SHALL present the architecture in a visually clear format such as a diagram description, icon list, or flow layout.

---

### Requirement 11: Footer

**User Story:** As a visitor, I want a complete footer, so that I can find college challenge info and social links.

#### Acceptance Criteria

1. THE App SHALL display a footer containing college innovation challenge information and a copyright notice.
2. THE App SHALL display social media icons in the footer using Bootstrap Icons.

---

### Requirement 12: Visual Design and Responsiveness

**User Story:** As a user or judge, I want a polished, mobile-friendly interface, so that the app looks professional on any device.

#### Acceptance Criteria

1. THE App SHALL apply a consistent pink-white color theme across all sections.
2. THE App SHALL use Bootstrap 5 and Bootstrap Icons as the only external CSS/JS libraries.
3. THE App SHALL be split into three separate files: `index.html`, `style.css`, and `script.js`.
4. THE App SHALL implement smooth scrolling for all anchor navigation.
5. WHILE the viewport width is below 576px, THE App SHALL render all sections in a single-column layout without horizontal overflow.
6. THE App SHALL display a loading animation on the SOS_Button while the API POST request is in progress.
7. THE App SHALL use Toast notifications for all user feedback events (SOS sent, contact saved, contact deleted, call accepted).
