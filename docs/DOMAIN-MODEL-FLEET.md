# Fleet domain model — proposal

Status: **for review.** Nothing here is implemented yet.

---

## 1. What the current model gets wrong

Three findings from the existing code, each of which the new model should fix.

**Loadouts are linked to ships by name.** `FleetPage` matches them with
`lo.ship.toLowerCase() === ship.name.toLowerCase()`. Rename a ship and its
build silently detaches; own two ships of the same model and a single loadout
appears to belong to both. This is a correctness bug today, not just a
modelling preference.

**Acquisition is stuffed into free text.** `FleetCard` writes
`notes: "Acquired: Pledge"`. It cannot be filtered, counted or validated, and
it collides with whatever the player wanted to write in their own notes.

**The persisted blob has no schema version.** Every past change has been
absorbed by defensive `Array.isArray` checks at load. That works for adding a
list; it does not work for reshaping a record, because there is no way to tell
a v1 ship from a v2 ship.

---

## 2. The central recommendation

**Do not model operational status as one enum.**

The proposed values mix three independent questions:

| Question | Proposed values that answer it |
|---|---|
| Do I own it? | Wishlist |
| Can I fly it right now? | Ready, Stored, Awaiting Claim, Under Maintenance, Loaned |
| What is it set up for? | Cargo / Combat / Mining / Medical / Expedition Ready |

Collapsed into one field, these become mutually exclusive — and they are not.
A ship can be **stored and combat-configured**. A mining ship can be **awaiting
a claim**. Under a single enum, "my mining ship is currently being claimed" is
inexpressible, and so is the dashboard question *"how many mining-capable ships
are available right now?"* — which is exactly the kind of question this sprint
exists to enable.

**Three orthogonal axes instead:**

```
ownership     owned | wishlist            "is this mine?"
availability  ready | stored | claiming   "can I fly it now?"
              | maintenance | loaned
roleFitness   DERIVED, not stored         "what is it set up for?"
```

Every future question becomes a filter across axes rather than a special case:

- *Mission ready?* → `ownership=owned AND availability=ready`
- *Needs attention?* → `availability IN (claiming, maintenance)` or insurance expiring
- *Still needs a loadout?* → derived completeness is `none`
- *Part of future plans?* → `ownership=wishlist`

---

## 3. Stored versus derived

A field that can be computed should not be stored. Stored derivations drift:
the moment a component is removed from a loadout, a stored "Combat Ready" flag
becomes a lie, and nothing forces it to be corrected.

**Derive, never store:**

- Loadout completeness — compare the loadout's components against the ship's
  hardpoints from the catalog
- Missing components / missing weapons — the same comparison, itemised
- Role fitness (cargo/combat/mining/medical ready) — role plus completeness
- "Configured" counts — a loadout exists for this ship id

**Store, because only the player knows:**

- Ownership, acquisition, insurance
- Availability
- Primary ship, tags, notes
- Last flown

---

## 4. Proposed model

```ts
/** How the player came by the ship. Was previously free text inside notes. */
type Acquisition = 'pledge' | 'in-game' | 'loaner' | 'gift' | 'unknown'

/** Ownership is binary. A wishlist entry has no availability. */
type Ownership = 'owned' | 'wishlist'

/** Where the ship is, from the player's point of view. */
type Availability =
  | 'ready'        // in a hangar, flyable now
  | 'stored'       // stored, needs retrieving
  | 'claiming'     // destroyed, insurance claim running
  | 'maintenance'  // deliberately grounded
  | 'loaned'       // lent to an org or a friend

/**
 * Insurance is two facts, not one: what kind, and when it lapses. Only timed
 * policies have an expiry, which is what makes reminders possible without
 * pretending LTI expires.
 */
type Insurance =
  | { type: 'lti' }
  | { type: 'timed'; expiresAt: string }   // ISO date
  | { type: 'none' }

interface Ship {
  id: string
  /** Catalog vehicle id (UEX / wiki). The link to specs, image, hardpoints. */
  catalogId?: string
  name: string                 // player's name for it, or the model name
  model: string                // "Cutlass Black" — what it actually is
  manufacturer: string
  /** Player override; otherwise inferred from the catalog. */
  role?: string

  ownership: Ownership
  acquisition: Acquisition
  insurance: Insurance
  availability: Availability   // ignored when ownership = 'wishlist'

  isPrimary: boolean
  tags: string[]
  notes?: string               // genuinely the player's own text again
  lastFlownAt?: string         // ISO
}
```

And the one change on the other side of the relationship:

```ts
interface Loadout {
  id: string
  shipId: string   // was: ship: string (a name)
  // ...unchanged
}
```

---

## 5. Build today, defer later

Recommendation: implement the **shape** of everything above, but only surface
what earns its place immediately.

### Build now

| Field | Why it earns its place today |
|---|---|
| `Loadout.shipId` | Fixes a live correctness bug |
| `catalogId` | Unlocks specs, images and hardpoints without name lookups |
| `ownership` | Makes the wishlist real; one field, immediate hero value |
| `availability` | The core of every readiness question |
| `acquisition` | Already collected — just stored properly |
| `insurance` | Shape now, reminders later; cheap to add, expensive to retrofit |
| `isPrimary`, `tags`, `notes` | Trivial, and immediately useful for filtering |

### Defer

| Field | Why wait |
|---|---|
| Squadron assignment | Belongs on an Org/Squadron entity, not on Ship. Many-to-many. Needs the org model first. |
| Pending upgrades | Requires component-level diffing that does not exist yet |
| Missing components / weapons | Needs per-ship hardpoint data from the catalog; derive once that exists |
| Variant | `model` covers it until the catalog gives us variants as distinct records |
| Role fitness values | Derived — nothing to store |
| `lastFlownAt` | Store the field, but there is no reliable way to populate it. Manual entry only, low value until it can be automatic. |

**On squadron assignment specifically:** putting a `squadronId` on Ship looks
easy and will hurt. A ship can be committed to more than one operation, and an
assignment has its own facts — who assigned it, for which op, until when. That
is a join table, and it should wait for the org work rather than being
approximated by a string on the ship.

---

## 6. Migration

The data lives in a JSON blob per user, so this is a normalizer at load time,
not a SQL migration. No downtime, and no backend deployment is required for the
model change itself.

**Step 1 — version the blob.** Add `schemaVersion: 2`. Absence means v1.

**Step 2 — migrate v1 ships on read**, once, then persist:

```
name         → name, and model (same value; the player can correct it later)
manufacturer → manufacturer
type         → role
notes        → parse a leading "Acquired: X" into acquisition, keep the
                remainder as notes; unmatched values become 'unknown'
(new)        → ownership: 'owned'      — everything already present is owned
(new)        → availability: 'ready'   — the least surprising default
(new)        → insurance: { type: 'none' }
(new)        → isPrimary: false, tags: []
```

**Step 3 — relink loadouts.** For each loadout, resolve `ship` (a name) against
the fleet, case-insensitively, and write `shipId`. Keep the original string in
`shipNameAtMigration` so an ambiguous or failed match is recoverable rather than
silently dropped. Where a name matches two ships, attach to neither and flag it
in the UI for the player to resolve — guessing would silently misattach a build.

**Step 4 — leave v1 readers working.** The normalizer runs before any component
sees the data, so nothing downstream needs to handle both shapes.

**Risk:** the migration runs client-side, so a player on a stale tab could write
v1 data back over v2. Mitigation: the save path should refuse to write a blob
whose `schemaVersion` is lower than the one it loaded.

---

## 7. What this unlocks

Once the axes exist, the hero modules the Atlas brief described become
straightforward reads rather than new features:

- **Fleet readiness** — count by `availability`, grouped
- **Needs attention** — `claiming` or `maintenance`, plus insurance lapsing inside 30 days
- **Still needs a loadout** — ships with no loadout referencing their id
- **Future plans** — `ownership = 'wishlist'`
- **Organization assignments** — the deferred join table, when the org model lands

---

## Open questions for you

1. **Availability defaults.** Migrating every existing ship to `ready` is the
   least surprising option, but it will overstate readiness until players
   correct it. The alternative is `stored`, which understates it. Which
   error would you rather have?
2. **Wishlist ships and loadouts.** Should a wishlist ship be allowed a
   loadout — planning a build before owning the hull? I would say yes, and it
   is free under this model, but it changes what "configured" counts mean.
3. **`model` versus `name`.** Splitting them lets a player call a ship
   "Old Reliable" while keeping "Cutlass Black" for specs. It also adds a field
   to the add-ship form. Worth the extra input?
