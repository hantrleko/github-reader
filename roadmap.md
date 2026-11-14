# Current work
- [x] Teaching path mobile polish (360/390px): no sideways scroll, 44px controls, stacked actions, visible focus; all three paths walked in browser at 1280/390/360 in EN and ZH; 558 tests, lint 0 errors, type check and build pass; not published.
- [ ] Desktop top menu covers the language switch in English at 1280–1536px (mouse click blocked; keyboard works). Left out of the polish pass by scope; waiting on owner go-ahead.
- [x] Teaching path OLS/IV → CAPM → options delta hedge on existing lab tabs, with question-led homepage entry; 555 tests, lint 0 errors, type check and production build pass; not published.
- [x] Remove forced vendor chunking responsible for production startup blank screen; automatic build OK, 541 tests pass, homepage/OLS-IV/backtest preview startup verified; not published, production runtime remains unverified.
- [x] Fix TradingView screener cache isolation across request parameters; 12 regression tests and all 541 tests pass, preview build OK; not published or deployed.
- [x] Embed landscape and portrait videos in the newcomer introduction with replay access; orientation selection and dialog flow verified.
- [x] Restore opening animation visibility; new-session policy tests and manual replay verified.
- [ ] Verify MP4 playback in a normal browser: sandbox Chromium has no H.264/AAC decoder; uploaded files and CDN responses validated.