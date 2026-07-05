# Nexus Nook — Product Vision & the Safest Path to Build It

> Companion to [`COMPLIANCE.md`](COMPLIANCE.md). This translates the product
> vision into the **easiest and safest** way to build each piece without
> breaching Cloud Imperium Games (CIG) / RSI terms. Not legal advice.

## The vision

A fully intuitive, efficient Star Citizen companion app — view **inventory,
fleet, org, chat, server status, account info** — that lets you feel a part of a
"Nook in the wide expanse of the Nexus." A social, community-first slice of the
verse, tied to the Nexus Discord.

## The key reframe (why the vision makes compliance *easier*)

Star Citizen has **no official API**, and RSI's terms forbid scraping their site
or using a player's RSI login. So the unsafe version of this app is "we log into
RSI and pull your data." The safe version — which also fits the vision better —
is: **the user owns their data inside Nexus Nook, the community lives in the app,
and reference data comes from compliant community sources.** That's the "Nook,"
not a mirror of the RSI website.

## Feature-by-feature: the safe approach

| Feature | Safe & easy approach | Avoid |
|---|---|---|
| **Server status** | Display community/status-page data; clearly labeled, cached | Implying it's official |
| **Fleet** | User builds their fleet by picking ships from a compliant ship database (Fleetyards / SC Wiki, with attribution). Their fleet lives in *their Nexus Nook account*. | Importing a hangar by scraping RSI |
| **Inventory** | Manual entry / user-managed lists in their Nexus Nook account | Pulling RSI inventory (no API; scraping banned) |
| **Org** | Org pages *inside* Nexus Nook (you create the org, members join in-app); optionally link out to the public RSI org page | Scraping RSI org rosters |
| **Chat** | **Discord integration** (official API + OAuth) and/or native in-app community chat you host. This is the social heart of the "Nook." | Anything tied to RSI accounts |
| **Account info** | The user's **Nexus Nook** account (already built: register/login/JWT). Let users *type in* their public RSI handle for display. | Storing RSI credentials (never) |
| **Ship database** | Fleetyards / SC Wiki / UEX data with required attribution | Bundling official CIG art/marketing assets |

**Takeaway:** every feature in the vision is achievable *without ever touching a
user's RSI account* — by making Nexus Nook the home of the user's own data plus a
real community layer. Discord integration (you already have a Discord) is the
single highest-value, fully-compliant feature and the truest expression of "a
Nook in the Nexus."

## The two safest moves you can make (both low-cost)

1. **Email CIG and ask.** A short, friendly message describing the app (unofficial,
   community-focused, no scraping, no marketing assets) and asking what they
   permit. Free, and the most direct way to be "iron-clad." Worst case they say
   no to something specific; best case you get a blessing and a relationship.
2. **Lean on Discord for the social layer.** Official, documented, OAuth-based —
   zero RSI-ToS exposure.

## Free / low-cost legal help (US)

These give *limited-scope* guidance, not a full launch review, and most have
eligibility rules — but they're real starting points:

- **USC Gould IP & Technology Law Clinic** — explicitly represents *game
  developers* on copyright/trademark/IP. (iptlc.usc.edu)
- **New Media Rights** — national list of law-school IP/entrepreneurship clinics
  to find one near you. (newmediarights.org)
- **University startup/IP clinics** — Stanford, BU/MIT, Pepperdine, U. Miami, etc.
  Free counsel for early-stage ventures (formation, IP, contracts).
- **Volunteer Lawyers for the Arts (VLA)** chapters — free/low-cost for creators;
  income-eligibility applies (often < 300% of federal poverty guidelines).
- **IGDA (International Game Developers Association)** — member resources and
  legal SIG for indie devs.
- **Bar association lawyer-referral services** — often a free/cheap 30-minute
  consult to scope your risk.

> Free help is usually narrow in scope. For trademark use and a monetization
> decision, a paid hour with a games/IP attorney later is worth it — these
> clinics are a great way to start and to prepare good questions.

## Suggested build order (safe-first)

1. **Discord integration + in-app community chat** — the social "Nook" (compliant).
2. **Fleet & inventory as user-owned data** — pick from a ship database, save to
   the Nexus Nook account.
3. **Org spaces in-app** — create/join orgs inside Nexus Nook.
4. **Swap mock server-status / ship data for a compliant community source** (with
   attribution).
5. **Account info polish** + public-handle display.
6. **Launch prep:** privacy policy, account deletion, store assets, attorney review.
