# Evensong — Design

A turn-based survival strategy game at the end of starlight. One civilization, kept alive
from the last dim red dwarfs (about 1.2×10¹⁴ years after the Big Bang) toward the end of
everything. The antagonist is not an empire; it is time. Explore, expand, exploit — and
**endure**.

Evensong shares its brief with other games by the same author but none of its design:
no galaxy map, no fleets or probes, no faction standings, no pace multipliers. Its answers
to the brief are its own, listed here.

---

## 1. Pillars

1. **The universe is the antagonist.** Every energy source in the game carries a death date
   you can read from the start. Nothing is taken from the player that was not foreseeable.
2. **Time stretches.** The player chooses each turn's length — the **stride** — in powers of
   ten years, within a window the universe drags forward. Turns go from centuries to spans
   beyond 10⁹⁰ years in a single game.
3. **Adaptation over conquest.** There is no conquest and no score. You persist by changing
   what your people are: their bodies, their substrates, their tempo, their appetites.
4. **Loss is metabolized, not ignored.** Losses create **Grief**. Grief tended by **Rites**
   becomes **Testament** — kept meaning — which feeds the civilization's **Flame** (its will
   to go on) and pays for its deepest undertakings. Grief untended corrodes the Flame.
5. **Honest physics, labelled speculation.** Every almanac entry and inquiry is marked
   **[attested]** (follows the physical-eschatology literature) or **[apocryphal]**
   (the game is speculating, and says so).

---

## 2. The shape of space: the Sounding

There is no star chart. With no faster-than-light travel, a place *is* its distance: how
many years light takes to come from it. The map is therefore a **sounding line** — a single
vertical column, like a line paid out into deep water. Depth is the logarithm of
light-distance from your home hearth.

Bands, top to bottom:

| Band | Light-distance | What lives there |
|---|---|---|
| **Hearthside** | 0 (the home system) | Your first world and its dying red dwarf |
| **The Near** | to ~10 ly | The closest remnants and rogue worlds |
| **The Shallows** | to ~10² ly | White dwarfs, a brown-dwarf pair, a neutron star |
| **The Reach** | to ~10⁴ ly | Richer remnants, a stellar black hole, other Voices |
| **The Deep** | to ~3×10⁴ ly | **The Anchor** — the galaxy's central black hole |
| **The Forsaken** | 10⁶ ly and beyond | Almost nothing. One wanderer. The dark between. |

Sites are hand-shaped from templates per seed: dying dwarfs, white dwarfs (with dark-matter
warmth), brown dwarfs, neutron stars, rogue worlds, black holes, derelicts. A site lists its
**sources** (each with a yield and a legible death date), its matter, its room, its hazards.

**Seeing is free; attention is not.** Light from everything already reaches you. The
**Ear** has a few attention slots per turn; pointing it at a band **resolves** unresolved
sites there (full detail, sometimes a finding). News of distant events arrives as
**Tidings**, always as old as their distance in light-years.

**The galaxy comes apart.** Through the second and third ages, dynamical evaporation takes
sites: some are flung (they recede and eventually leave the Sounding), some fall toward the
Anchor. Each such fate is announced ages in advance.

---

## 3. Time: the Wheel and the stride

The game tracks the age of the universe as `log₁₀(years)` from the start, so the same
arithmetic carries the game from 10¹⁴ to 10^(10^120) years without losing precision.

- Each turn the player picks a **stride**: the turn's length, as a power of ten of years,
  from a window `[floor, floor + width]`. The **floor** is the Wheel: it rises every turn at
  the age's rate, and the player can never fall behind it. Width starts at 2 (a hundredfold
  choice) and grows when slow minds dominate.
- Era floor rates (log₁₀ per turn): Vigil ≈ 0.26, Ash ≈ 0.31, Wells ≈ 2.4, Hush ≈ 5.
  A standard game runs roughly 35 + 28 + 30 + 20 ≈ **110 turns**.
- **Short strides** let you act inside brief windows (a flare, a visit, a dying world's last
  centuries). **Long strides** cross dead time but integrate every scheduled death they
  pass, waste flash energy beyond storage, and strain minds that cannot slow.
- **Governance horizon.** Each Shape can ride a stride only so long before the span between
  decisions exceeds what it can govern of itself (Embodied ~10⁴ yr; Graven 10⁸, more with
  inquiry; the Manifold 10¹⁰; the Stilled effectively unbounded; the Wrought have no one
  inside to lose). Striding past a Shape's horizon causes **drift**: Flame loss and, if
  repeated, severance events. This is Dyson's slowing argument made spatial: only minds that
  can slow themselves can ride the deep strides for free.

The economy is deliberately **per-turn**, not per-year: production and upkeep are rates, and
a rate against a rate is the same at any stride. What stride changes is the *schedule* —
which deaths, arrivals, and windows a turn swallows — and that is the game.

---

## 4. The people: Shapes

The civilization is counted in **hearths** (a hearth is a community; individuals are never
shown). Each hearth has a **Shape**:

| Shape | What it is | Keeps | Costs / limits |
|---|---|---|---|
| **Embodied** | The original living people | Rites ×2 (grief tended best), lore, legitimacy | High upkeep; need warmth (a living world or a Hearthhall); horizon 10⁴ yr |
| **Graven** | Minds engraved into substrate | Low upkeep, strong lore, can slow | Need matter to make; fade if unpowered; horizon 10⁸ → 10¹² yr |
| **Manifold** | Many minds woven into one | Steadies the Flame, strong lore, horizon 10¹⁰ yr | Needs ≥2 Graven to weave; some grieve its making; cannot unweave |
| **Wrought** | Made things that work with no one inside | Industry, immunity to drift and despair | No lore, no rites; if only Wrought remain, continuity fails — unless you *meant* it (see endings) |
| **Stilled** | Minds slowed toward stillness | Near-zero upkeep, boundless horizon | Almost no output; waking costs; helpless if struck |

**Conversions** are the moral machinery, each with costs, grief, and doctrine interactions:
Engrave (Embodied→Graven), Weave (Graven→Manifold), Still (Graven/Manifold→Stilled), Wake
(Stilled→what they were), Forge (build Wrought from matter), and late in the tree Rekindle
(Graven→Embodied, needs a warm refuge and matter). Conversions respect or violate consent
according to doctrine, with different speeds, grief, and Stain.

**Stances.** Each Shape runs Quick, Even, or Slow (if it can slow): Slow divides both its
upkeep and its output by five. Since stored **Charge** drains per turn, slowing stretches a
fixed store across more turns — Dyson's bargain, bought at the price of thought.

---

## 5. Resources

| | What it is | Notes |
|---|---|---|
| **Charge** | Banked energy | Capped by cisterns. The only buffer against source deaths. Flashes beyond the cap are lost — "you caught a cupful." |
| **Matter** | Mass in hand | The deep battery: convertible to Charge at the age's efficiency (chemistry → fusion → the Anchor's gullet at ~0.4). Also the stuff of substrates, Wrought, ferries. If protons decay, it quietly shrinks. |
| **Lore** | Understanding | Earned by minded hearths; spent as inquiry progress. |
| **Testament** | Kept meaning | Distilled from Grief by Rites; pays for doctrines and the great endings. |
| **Flame** (0–100) | The will to go on | Decays under grief, dark, hunger; fed by rites, refuge, beauty, arrivals. At 0 for three consecutive turns, the civilization lets go. |
| **Grief** | Unmetabolized loss | Every death, abandonment, and forced conversion adds to it. |
| **Stain** | What you became to survive | Siphoning Voices, feeding inhabited places to the Anchor, commanding the Gleaner. Quietly changes endings. |

Income/upkeep resolve per turn: production − upkeep; deficits drain Charge, then burn
Matter, then **the Dimming**: Embodied die first, Graven fade, the Stilled sleep through it.

---

## 6. The four ages

1. **The Vigil** (from 1.2×10¹⁴ yr). The last red dwarfs. The home star brightens before it
   collapses — the first crisis is your own sun blooming. Strides 10²–10¹¹ yr.
2. **The Ash** (to ~10²⁰ yr). No star burns. Warmth is white dwarfs held at tens of kelvins
   by dark-matter annihilation (Adams & Laughlin 1997) — until the halo is gone; infall
   flashes; rare new stars from brown-dwarf collisions and white-dwarf mergers. The galaxy
   evaporates out from under you.
3. **The Wells** (to ~10⁴⁰–10⁸⁵ yr). Black holes are the warmest things left: spin to be
   milled, a faint Hawking glow, final bursts. The lightest die first. Matter's own fate
   (below) plays out here.
4. **The Hush**. Nothing makes light. Stored Charge, hoarded matter, minds near stillness.
   Positronium forms (~10⁸⁵ yr) and decays (~10¹⁴¹). The last black hole's burst is the
   last loud thing that will ever happen.

Each transition is a **Threshold**: a full-screen litany naming what was lost and what
remains, with one irreversible choice.

**The fate of matter** is a hidden truth: protons decay (~10³⁸ yr), or matter is stable
(solids still flow by 10⁶⁵ yr, Dyson 1979), or space slowly unmakes dense matter
([apocryphal] curvature evaporation, after Falcke, Wondrak & van Suijlekom 2024). The
inquiry **The Proton Watch** reveals it mid-game; at setup the player may instead choose
the truth, or be told it at the start.

---

## 7. The others

**Voices** — a handful of other civilizations, part of the world, never rivals on a score:

- **The Choir Beneath Glass** — aesthetes wintering on a dark-matter-warmed white dwarf,
  trading understanding for meaning; doomed when the halo fails, unless someone takes them in.
- **The Bright Needle** — a civilization spending itself gloriously fast on a merger star,
  deaf to caution, generous beyond sense. Gone by the Wells. Leaves you everything.
- **The Patient Kings** — sleepers banked around the Anchor who answer in ten-thousand-year
  sentences and keep the mathematics of the end.
- **The Meek** — biologicals hidden inside a rogue world, terrified of being seen,
  who know how to be invisible to the Gleaner.

All contact is **letters**. A letter travels at light speed; the reply returns after the
round trip, answered by whoever the recipient is *when it arrives* — possibly by no one.
You can greet, trade lore for testament, beam Charge (lossy with distance), offer or ask
refuge, warn — or **siphon** (dark: read their archives by deceit, or worse). You watch
other lights go out, and what you did reaches them after years you can count.

**The Gleaner.** An old, mindless harvester — the Wrought of a civilization that died with
no one left inside — that follows warmth down the Sounding like weather. It can be dimmed
away from (the Quiet), decoyed with a burning cache, survived, or understood
(Gleaner-tongue): understood, it can be turned — or, at the price of becoming it, commanded.

---

## 8. Inquiries and doctrines

**Inquiries** are the research tree: five Books of ~5 nodes each — **Fire** (sources,
cisterns, the forge), **Roads** (ferries, speed, the long coast), **Vessels** (shapes,
conversions, horizons), **the Deep** (mills, Hawking light, Gleaner-tongue), **the Hush**
(the Proton Watch, the great endings). Each card is [attested] or [apocryphal].

**Doctrines** are adopted laws, at most three held (five with the Weave): consent, the body,
salvage, silence, the open door, rationing of sleep. Each has mechanical teeth and a moral
weight; adopting and repealing both cost Testament, and what a doctrine did once stays done.

**Rites** turn Grief into Testament each turn (Embodied are twice as good at them). The
**Chronicle** records everything; the **Almanac** explains the physics with sources.

---

## 9. Travel

**Ferries** are commitments, not units: build one, load it (hearths, matter, a letter, a
gift), pick a speed (slower is cheaper), and it departs — a date in the Chronicle until it
arrives. No steering, no fleets. As strides lengthen, a crossing that took ten turns takes
one; by the Wells the whole Sounding is a step. Light-years are honest throughout.

---

## 10. Endings

Ways to persist (victories, none "right"):

| Ending | Path |
|---|---|
| **The Slow Amen** | The Stilled think one unending thought: finish *Litany Without End*, hold Stilled majority through the Hush |
| **The Manifold Entire** | Weave every remaining mind into one voice that needs almost nothing |
| **A Garden Without Gardeners** | The Wrought tend the archive and the dark forever — victory only if the Testament vault is full; otherwise it is just machinery |
| **The Last Hearth** | Embodied alive in the Hush — only if matter is stable |
| **The Gate** | [apocryphal] Write the Testament into the Anchor's final evaporation, for whatever reads Hawking light after us |
| **Still Here** | Endure to the recurrence time, 10^(10^120) years, when the universe's state comes round again |
| **The Gleaner's Crown** | The dark path: Stain at full, the Gleaner commanded — you survive as the thing you feared |

Defeats: **Ashes** (no one left), **The Guttering** (the Flame fails), **Severance**
(continuity breaks: only the unminded remain with an empty vault, or the chain of memory is
lost in the dark).

---

## 11. Presentation

- **Elegiac, not grimdark.** Losses are stated plainly in the Chronicle's language. Small
  persistence is honoured ("the Ninth Hearth still keeps its feast-day, four billion years
  on").
- **Typographic and liturgical**: a service-book of the end. Serif text on near-black,
  thin neon only where people still live, honest black skies. No people are ever shown.
  No image assets at all — everything is type, CSS, and canvas.
- **Sound** is a procedural Web Audio drone that thins by age — partials fall away until
  the Hush is almost silence — with small bells for the Wheel and letters. Mutable.
- **Numbers**: years shown as names while they fit ("214 billion years"), then as powers of
  ten; the **Vigil Line** across the top is a log-time ribbon from 10¹⁴ to the recurrence,
  with every foreseen death marked on it.
- All animation is driven by elapsed time, never frame count — identical at any refresh
  rate. `prefers-reduced-motion` is respected.

## 12. Build

No build step, no dependencies, no network: plain script tags over a shared `EV` namespace,
playable by double-clicking `index.html` (and GitHub Pages-ready). The simulation is
DOM-free and seeded-deterministic so `node test/autoplay.mjs` can play hundreds of full
games headlessly and assert invariants. A Playwright smoke test drives the real page with
the preinstalled Chromium.

## 13. Science notes (anchors used)

Star formation ends ~10¹⁴ yr; late red dwarfs persist beyond it. Red-dwarf terminal
brightening and white-dwarf collapse; dark-matter-heated white dwarfs at tens of kelvins
while the halo lasts (Adams & Laughlin 1997). Brown-dwarf collisions making new red dwarfs;
white-dwarf mergers. Close stellar passes stripping planets (~10¹⁵ yr each); gravitational-
wave infall of close worlds (10¹⁶–10²⁰ yr). Galactic evaporation 10¹⁹–10²⁰ yr; other groups
beyond the horizon (Krauss & Scherrer 2007). Proton lifetime >~10³⁴ yr (unknown); Dyson's
cold flowing solids at 10⁶⁵ yr; curvature evaporation [apocryphal] (Falcke, Wondrak & van
Suijlekom 2024). Black-hole lifetime ≈ 2×10⁶⁷·M³ yr and final bursts; positronium at ~10⁸⁵
decaying ~10¹⁴¹ (Page & McKee 1981); recurrence ~10^(10^120) yr. Dyson (1979) on slowed
minds; Krauss & Starkman (2000) on the accelerating universe's limits — in-game as the
Hush's hard budget. Deviations are flagged [apocryphal] in the Almanac.
