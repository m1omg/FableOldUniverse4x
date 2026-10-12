# Evensong

*A vigil at the end of starlight.*

Evensong is a turn-based survival strategy game. You keep one civilization alive from the
last dim red dwarfs — about 1.2×10¹⁴ years after the Big Bang — toward the end of the
universe. The antagonist is time: every age takes away something you depended on, every
energy source carries a death date you can read in advance, and the game asks how long you
can last and what "alive" ends up meaning. There is no conquest and no score. The fourth X
is **endure**.

## Playing

**No install, no build.** Open `index.html` in a browser (double-click works), or serve the
folder and play at the printed address:

```sh
python3 -m http.server 8014   # then open http://localhost:8014/
```

New players: keep **Litany of first steps** on at setup — it offers one quiet hint at a
time. The **Rubric** (`?` or H) is the full how-to-play; the **Almanac** (A) explains the
real physics, with speculation labelled [apocryphal].

The short of it:

- The map is the **Sounding** — a line paid out into the dark. Depth is light-distance from
  home. Click a site to read it; the **Ear** resolves far places (light already reaches
  you; only attention is scarce).
- Each turn, choose your **stride** — how many years the turn covers, in powers of ten,
  inside a window the Wheel drags forward — then **Turn the Wheel** (Enter). Strides start
  at centuries and end beyond 10⁹⁰ years.
- **Energy is the master resource.** Watch each source's death date, bank **Charge** before
  the gaps, and remember matter is the deep battery.
- Your people live in **hearths** of five Shapes — Embodied, Graven, Manifold, Wrought,
  Stilled — and changing Shape (engraving, weaving, stilling, forging, waking) is how you
  outlast each age. It is also morally loaded, and your **doctrines** decide how it is done.
- Loss creates **Grief**. **Rites** turn grief into **Testament** — kept meaning — which
  feeds the **Flame**, the will to go on. If the Flame gutters out, that is a way to lose.
- Other civilizations are **Voices**: everything between you moves at light speed, as
  letters. A plea can arrive after its sender is dead. And something old and mindless — the
  **Gleaner** — follows warmth down the Sounding like weather.
- Persistence has many shapes and the game ends in one of them: slowed minds, one woven
  voice, machines that keep the garden, bodies in the dark, a message written into the last
  black hole's light, simple endurance to the recurrence — or the dark one, if you become
  the thing you feared.

Keys: **Enter** turn the wheel · **←/→** stride · **C** chronicle · **L** letters ·
**I** inquiries · **D** doctrines · **V** vessels · **A** almanac · **?**/H rubric ·
**M** mute · **Esc** close. Saves live in your browser (autosave each turn, plus manual
slots); **Export** copies a save as text you can keep or move between devices.

## Development

Everything is dependency-free, plain JavaScript over a shared `EV` namespace — no npm, no
bundler. The simulation (`js/sim/`) never touches the DOM and is seeded-deterministic, so
it can be driven headlessly:

```sh
node test/autoplay.mjs            # play many full games, assert invariants
node test/autoplay.mjs --seeds 60 # more seeds
node test/smoke.mjs               # Playwright browser smoke test (needs Chromium)
```

`docs/DESIGN.md` is the design. The interface (`js/ui/`) draws the Sounding on canvas with
all animation driven by elapsed time, so the game behaves the same at any display refresh
rate.

## Credits

Design and code built with Claude Code. The science follows Adams & Laughlin (1997), Dyson
(1979), Page & McKee (1981), Krauss & Scherrer (2007), Krauss & Starkman (2000), and —
labelled as speculation — Falcke, Wondrak & van Suijlekom (2024); see the in-game Almanac.

Licensed under the GNU GPL v3.
