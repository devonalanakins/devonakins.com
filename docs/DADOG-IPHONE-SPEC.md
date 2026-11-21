# Dadog for iPhone — initial development specification

Status: **proposed, unimplemented**. This is a personal assistant concept for Devon Alan Akins, not a claim of an existing service, model, App Store listing or approved data integration. The current website PR does not create an app or connect private systems.

## Outcome and first slice

Provide an iPhone-native place to capture a thought, ask Dadog a question and return to the conversation later. Dadog should be direct, useful and evidence-aware; it must not claim to be Devon or invent memories. Devon controls what is saved, shared and deleted. The first slice targets one owner and one device; collaboration, public accounts and cross-device sync are outside its initial acceptance criteria.

Proposed first-run flow: explain local storage and network behavior, let Devon start a local conversation or note, and show whether an assistant service is configured. Local capture and reading must remain usable offline. Sending a message to an assistant requires a separately configured, explicitly chosen service; if none is approved or available, retain the unsent draft and say so. Do not simulate a response or label a saved note as sent.

Conversation view: a readable message history, editable composer, send/cancel, retry with user action, distinct pending/sent/failed states, and source links when a response actually supplies them. Separate user-authored text, assistant output and service errors. A user can create, rename, export and delete a conversation, with confirmation for deletion; editing a draft never silently resends it. Never execute actions, send messages, change external records or make purchases from a generated answer.

## Proposed architecture and boundaries

- Native Swift and SwiftUI app with clear presentation, domain and storage/service boundaries. Choose the minimum supported iOS version and exact persistence framework after checking the actual Xcode and device constraints; do not assume an Apple developer account or Mac is configured.
- Local-first conversation store behind a protocol, with migration/version handling, explicit export and deletion, and iOS file protection appropriate to the threat model. Keep secrets out of the conversation database and logs; if a later service needs a credential, use a narrowly scoped Keychain item and document accessibility, backup and revocation behavior. Do not embed provider keys in the binary.
- Assistant transport behind an injectable interface: request, cancellation, timeout, response and typed errors. No provider, server, model, API key or paid usage is selected by this spec. Before enabling a remote service, review data flow, retention, cost, credentials, authentication, prompt-injection handling and revocation, then obtain the required approvals. A mock transport is for tests and must be visibly identified as such.
- No automatic access to private Knowledge, email, calendar, contacts, clinical systems or other accounts. A future integration needs separate authorization, scoped access, a concrete data contract and user-visible controls. Personal and professional data must not be merged by default.
- Default to no analytics, tracking, advertising SDK, microphone, notifications, widgets, background sync or shared containers in the first slice. Future capabilities need their own purpose, permission and privacy review. Avoid sensitive content in logs, notifications, screenshots and crash reports; verify actual OS backup and deletion behavior instead of promising secure erasure.

## Acceptance

1. On a supported physical iPhone, create, reopen, rename, export and delete a conversation; confirm data persistence, deletion, relaunch, app interruption, low storage and offline behavior. Export is a deliberate user action and clearly identifies its destination.
2. With a mock service, test pending, success, network loss, timeout, cancel, retry, duplicate-send prevention, malformed response and app termination. No real data leaves the device in these tests. Real service behavior needs a separate approved end-to-end test.
3. Exercise VoiceOver, Dynamic Type including accessibility sizes, light/dark appearance, reduced motion, keyboard focus and adequate touch targets. Test long content and small screens without clipping.
4. Test first launch, migration, local protection while locked, credential absence/revocation and deletion/export boundaries. Inspect logs and artifacts for private data. Keep security claims limited to observed test conditions.
5. Build and run automated unit/UI tests in an appropriate Xcode environment; review the actual device experience. Record exact revision, Xcode/iOS versions and test results. Simulator or unsigned build success is not a physical-device or distribution result.

## Decisions and release gates

Confirm the intended first conversation experience and data-retention expectations through review of this candidate. Before implementation, inspect existing personal repositories and project records for a suitable home and any newer decisions. Decide the service and data contract only when a real assistant integration is ready; no credentials, account changes, agreements or spending are authorized by this document. Signing, TestFlight, external distribution, App Store publication and changes to live services each require their own approval and verification.

## Apple references

- [SwiftUI](https://developer.apple.com/swiftui/): verify current framework documentation and supported OS versions before implementation.
- [Human Interface Guidelines: accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [privacy](https://developer.apple.com/design/human-interface-guidelines/privacy).
- [Keychain services](https://developer.apple.com/documentation/security/keychain-services).
