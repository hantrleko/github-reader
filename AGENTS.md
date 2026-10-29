# Architecture rules
- TradingView screener cache keys hash the request method, query and POST body in a versioned namespace; only identical public queries may share results.
- Keep uploaded introduction videos as Lovable Assets pointers, selecting one source by viewport orientation to avoid downloading both.
- Coordinate the global newcomer introduction with the homepage splash through explicit open/close events so dialogs never compete.
- Store automatic splash visibility per browser session; explicit replay remains available and automatic playback respects reduced motion.