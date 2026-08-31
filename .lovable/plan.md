# Fix homepage hero headline copy

## What
Remove the stray ampersand in the English homepage hero title so it reads as one continuous sentence:

```text
Turn Economic Theory Into Testable Experiments
```

## Where
`src/components/HeroSection.tsx` currently renders:

```text
Turn Economic Theory &
Into Testable Experiments
```

The `&` is hard-coded between `hero.title1` and `hero.title2`.

## Change
- Delete the hard-coded `<span className="italic text-gold">&amp;</span>` and its trailing space.
- Keep `hero.title1` + `hero.title2` on the same visual line (remove the forced `<br />` or restructure so the line flows naturally).
- Preserve the existing gold color treatment on `hero.title2`.
- Do not touch any lab functionality, navigation, or other copy.

## Verification
- Open the homepage preview and confirm the headline now reads "Turn Economic Theory Into Testable Experiments" with no ampersand and no awkward line break.
- Confirm Chinese locale is unaffected.
