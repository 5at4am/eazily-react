# Navigation update

Customer screens now have a persistent navigation bar with Back, Forward, the current screen name, and Home. Forward becomes available after returning to a previous screen. Service screens also retain the bottom navigation.

Customer page history stores the selected category, service group, service, professional, and scroll position. Opening related services creates a history entry. Changing tabs clears stale service/vendor URL parameters. Repeated Home taps do not create duplicate entries. Direct service links have an in-app Back fallback.

Account panels, chat conversations, and bulk-order steps participate in browser history. Their Android Back handlers consume the action before the outer screen exits. Professional profile sheets use the page history rather than adding a second competing history entry. General sheets retain their own close/back behavior and now display a visible Back action. Partner pages and sign-in also have visible Back controls; cancelling customer sign-in returns to its originating screen.

Navigation state is scoped to the current customer account. Chat history layers include the account identity, so switching accounts cannot restore another account's selected conversation.

Validation:

- `npm.cmd run test:navigation`: category, service, provider and related-service Back/Forward; URL cleanup; scroll restoration; sheet-to-page transitions; nested history; deep links; forward-branch truncation; repeated Home taps; account isolation.
- `npm.cmd run test:source`: app and seven JSX fixtures compile.
- Existing offline functionality regression suites, auth tests, and chat tests.
- Production web build and Android debug build.

BrowserOS is unavailable in this session. Visual layout and physical-device navigation still require manual verification. Local tests do not verify live authentication, chat delivery, or booking completion.
