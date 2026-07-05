# Nexus Nook — Compliance Guide (Unofficial Star Citizen Companion App)

> ⚠️ **THIS IS NOT LEGAL ADVICE.** This document is an engineering/product research summary compiled from publicly available policies as of **June 2026**. It is intended to help the Nexus Nook team build on a defensible footing and to prepare questions for counsel. It is **not** a substitute for review by a qualified games / intellectual-property attorney licensed in your jurisdiction. **Have a lawyer review the app, store listings, privacy policy, and data-source choices before launch.** Policies referenced here change frequently; re-verify every cited source before relying on it.

> **Sourcing note:** Several primary pages (RSI Terms of Service, RSI Fankit FAQ, UEX terms, the Star Citizen Wiki API portal) are served behind Cloudflare and returned HTTP 403 to our automated fetcher. The points below are drawn from search-engine excerpts of those pages plus accessible mirrors/repositories. Where a claim rests on an excerpt rather than a page we could fully read, it is flagged **[excerpt — verify against primary source]**. Treat every quoted disclaimer wording as *approximate* until copied from the live page.

---

## 1. Executive summary — the big risks

1. **There is no official public RSI/CIG API.** All "RSI account / hangar" data access today is via community tools that **scrape** the RSI website. Scraping RSI is **expressly prohibited** by the RSI Terms of Service (bots/spiders/scrapers/data-harvesting clause). Building Nexus Nook on scraped RSI account data puts the app on the wrong side of CIG's ToS. **[excerpt — verify]**
2. **Never collect a user's RSI email/password.** It violates RSI's ToS (account/credential sharing + automated access), it is a security and liability disaster, and it triggers app-store credential-harvesting and privacy scrutiny. There is no OAuth/official login from CIG to do this "properly."
3. **"Unofficial" labeling helps but does not by itself cure trademark use.** Google Play explicitly states an app can still violate its impersonation policy *even if labeled "unofficial"* if it uses another party's trademarks/branding. Apple Guideline 5.2 requires you to own or have licensed the IP you use. Disclaimers are necessary but **not sufficient**.
4. **The compliant path:** ask only for the user's **public RSI handle** (username), pull only **publicly available** data through **community APIs whose terms permit it** (with attribution), carry a prominent "unofficial / not affiliated with CIG" disclaimer everywhere, ship a real privacy policy and in-app account deletion, and — ideally — eventually seek CIG's blessing/partnership.

---

## 2. Cloud Imperium Games (CIG) / RSI policies

### 2.1 Fan content & the Fan Kit

CIG runs a Fankit and a "Fandom FAQ" governing unofficial fan sites, fan fiction, and fan films. Relevant points:

- **Required fan-site disclaimer.** Fan sites must display a notice substantially like: *"This is an unofficial Star Citizen fan site, not affiliated with the Cloud Imperium group of companies. All content on this site not authored by its host or users are property of their respective owners."* The notice must be placed where it is "open, obvious, and readily seen by any visitor." **[excerpt — verify exact wording against the live Fankit/Fandom FAQ]** ([RSI Fankit & Fandom FAQ](https://support.robertsspaceindustries.com/hc/en-us/articles/360006895793-Star-Citizen-Fankit-and-Fandom-FAQ), [Fankit](https://robertsspaceindustries.com/en/fankit))
- **Fan-fiction disclaimer.** Works drawing on CIG content must state the characters/ships/designs "are the property of Cloud Imperium Rights LLC and Cloud Imperium Rights Limited." **[excerpt — verify]**
- **No marketing assets.** The Fan Film/Machinima policy says no authorization is given to use Star Citizen marketing material (trailers, videos, concept art). Do not bundle official trailers/art into the app. ([Fan Film and Machinima Policy](https://support.robertsspaceindustries.com/hc/en-us/articles/5422808416151-Fan-Film-and-Machinima-Policy))
- **Commercial limits on fan productions.** Fan productions may not be paywalled and may not be used to obtain revenue except platform advertising revenue. The Fankit/Fandom FAQ is written around *sites, videos, and writing* — it is **not** an explicit grant to ship a monetized mobile **app** using CIG marks. Treat any commercial/subscription model as a question for CIG and counsel, not something the Fankit silently authorizes. **[excerpt — verify]** ([Fandom FAQ – Videos, writing, and more](https://support.robertsspaceindustries.com/hc/en-us/articles/115013196127-Fandom-FAQ-Videos-writing-and-more))

**Practical takeaway:** treat Nexus Nook as a "fan site/app" subject to the Fankit terms — carry the disclaimer, don't use logos/marketing assets beyond what the Fankit allows, and don't imply endorsement. The Fankit governs *expression about* Star Citizen; it does **not** grant access to RSI account data (see §2.2).

### 2.2 RSI Terms of Service / EULA — scraping, automation, accounts

- **Bots / scrapers / data harvesting are prohibited.** The RSI ToS prohibits using "bots", "spiders", "scrapers" or similar technologies on RSI Services — including automated refreshing, data scraping/harvesting, and scraping or harvesting information about other users. **[excerpt — verify]** ([RSI Terms of Service](https://robertsspaceindustries.com/en/tos), [ToS section](https://robertsspaceindustries.com/en/tos/8))
- **EULA anti-data-mining clause.** The EULA prohibits unauthorized third-party software that intercepts, "mines," or otherwise collects information from or through the Game or the Website. **[excerpt — verify]** ([RSI EULA](https://robertsspaceindustries.com/en/eula))
- **No account transfer / sharing.** The ToS bars selling, distributing, or transferring your RSI Account other than through means permitted by RSI. Handing your credentials to a third-party app to act as you is squarely in tension with this. **[excerpt — verify]** ([RSI Terms of Service](https://robertsspaceindustries.com/en/tos))
- **No reverse engineering / derivative works** of RSI Software without written authorization. **[excerpt — verify]** ([RSI EULA](https://robertsspaceindustries.com/en/eula))

**Is there an official public API?** **No.** As of June 2026 we found no evidence of an official CIG/RSI public API for account, hangar, ship, or game data. All programmatic RSI access is via **unofficial, community-built scrapers** (e.g. `pyrsi`, `starcitizen-api.com`, `RSI-Scraper`), each of which depends on scraping the RSI site and is therefore in tension with the ToS bot/scraper clause. ([pyrsi on PyPI](https://pypi.org/project/pyrsi/), [starcitizen-api.com](https://starcitizen-api.com/), [RSI-Scraper](https://github.com/Dymerz/RSI-Scraper))

### 2.3 Collecting a user's RSI email/password — DO NOT

Collecting RSI credentials in Nexus Nook is **not permissible** and should be designed out entirely:

- **ToS:** logging in as the user to pull data is automated access + effectively account sharing/transfer, both restricted (§2.2). **[excerpt — verify]**
- **Security/liability:** taking a user's primary RSI password makes you a credential store and a phishing-shaped pattern; a breach exposes users' RSI (and reused) credentials, and you inherit the liability. Industry best practice is to **never** take a third party's password — use delegated auth (OAuth) when available; here it is **not** available, so the only safe answer is to not log in at all. ([Why apps shouldn't take user passwords / OAuth rationale](https://www.infosecinstitute.com/resources/industry-insights/third-party-authentication-oauth-good-or-bad-for-security/), [OAuth for Mobile Apps best practices](https://curity.io/resources/learn/oauth-for-mobile-apps-best-practices/))
- **App stores:** credential collection for another company's service that the other company hasn't sanctioned draws Apple/Google privacy and impersonation scrutiny (see §4).

> **Note on the mock backend.** The current `docs/API.md` defines `POST /api/rsi/connect` with `{ "rsiEmail }` and the README flags credentials as a TODO. Before any real integration, this endpoint must be redesigned to take a **public handle only** (no email, no password). See §5.

---

## 3. Legitimate community data sources

All sources below are **unofficial and community-run**. None is endorsed by CIG. Each can change, rate-limit, or disappear. **You must read each provider's current terms yourself and, where required, request an API key and provide attribution.** We could not fully load some terms pages (Cloudflare 403); details marked *unverified* need first-party confirmation.

### 3.1 UEX Corp (`uexcorp.space`) — trade / commodity / ship / terminal data
- **Data:** crowdsourced commodities, prices, terminals, items, companies, ships, trade routes. ([UEX API docs](https://uexcorp.space/api/documentation/))
- **Auth:** API access tokens created via a "My Apps" page; supports optional client-version locking via an `X-Client-Version` header. ([UEX terms/about](https://uexcorp.space/about/terms))
- **Terms posture:** data is crowdsourced ("errors may happen"); UEX disclaims accuracy/liability and **reserves the right to modify, restrict, or terminate API access at any time, including for misuse.** ([UEX Terms of Use](https://uexcorp.space/about/terms))
- **License / attribution / commercial use:** **unverified** from our fetch (terms page 403'd). UEX has historically expected attribution and reasonable use; **confirm in writing** whether a commercial/monetized companion app is allowed and what attribution/branding is required before integrating. ([UEX Terms of Use](https://uexcorp.space/about/terms), [UEX community tools](https://uexcorp.space/api/community_made/))

### 3.2 Star Citizen Wiki (`star-citizen.wiki` / `api.star-citizen.wiki`) — ships, stats, comm-links, in-game data
- **Data:** ship/vehicle stats, manufacturers, comm-links, and other in-game/lore data, scraped & curated by the wiki. ([SC Wiki API](https://api.star-citizen.wiki/), [API repo](https://github.com/StarCitizenWiki/API))
- **Auth:** most endpoints public/no-auth; some (e.g. similar-image search) need a Sanctum bearer token. **[verify]**
- **Rate limits:** reported ~60 req/min for search endpoints, ~10 req/min for image search, per IP. **[verify against live docs]** ([Swagger docs](https://docs.star-citizen.wiki/))
- **License:** wiki content is **CC BY-SA 4.0** — **attribution required**, and share-alike obligations may apply to derived *content* you republish. Confirm how this interacts with bundling data in an app. ([SC Wiki disclaimer](https://starcitizen.tools/Star_Citizen_Wiki:General_disclaimer), [API info](https://starcitizen.tools/Star_Citizen_Wiki:Application_programming_interface))

### 3.3 Fleetyards (`fleetyards.net` / `api.fleetyards.net`) — ship database
- **Data:** ships, components, manufacturers, based on the official Ship Matrix. ([Fleetyards API v1](https://api.fleetyards.net/v1/), [docs](https://docs.fleetyards.net/))
- **Auth/limits:** HTTPS, JSON; specifics **unverified** — check docs/Discord. ([Fleetyards docs](https://docs.fleetyards.net/))
- **License:** the Fleetyards project is **GPLv3** (that governs the *code*; data-use terms for the hosted API are not separately spelled out — contact `info@fleetyards.net`). ([Fleetyards GitHub / README](https://github.com/fleetyards/fleetyards/blob/main/README.md))

### 3.4 `starcitizen-api.com` (a.k.a. "SC-API") — RSI website data proxy
- **Data:** Ships, **Users, and Organizations** scraped from the RSI website, plus `Data.p4k` extracts. ([starcitizen-api.com](https://starcitizen-api.com/), [getting started](https://starcitizen-api.com/startup.php))
- **Auth:** requires an API key; "live mode" requests consume the key. **[verify]**
- **⚠️ Caution:** because it **scrapes the RSI website** (including user/org pages), relying on it to fetch RSI account/org data inherits the RSI anti-scraping ToS concern (§2.2). Prefer it (if at all) only for clearly public, non-account ship/reference data, and get the §2.2 question answered by counsel/CIG first.

### 3.5 Server status / status-page sources
- The current mock returns `/api/servers/status` (canned). For real status, there is **no official public status API**; community "RSI Status" Discord bots/pages exist but scrape or infer status and are not authoritative. Treat live server status as **best-effort, unofficial**, and label it as such. ([RSI Status community bot](https://robertsspaceindustries.com/community-hub/post/rsi-status-discord-bot-spa6m7lnlgywj))

> **Cross-cutting:** every one of these is unofficial. If any of them depends on scraping RSI, your use of it carries the same ToS exposure as scraping RSI yourself. Prefer sources built on the **public Ship Matrix / crowdsourced data** (Fleetyards, UEX, SC Wiki) over sources that scrape RSI **account/user/org** pages.

---

## 4. App Store (Apple) & Google Play policy

### 4.1 Using CIG's IP / "official"-looking branding
- **Apple Guideline 5.2 (Intellectual Property):** apps must be submitted by an entity that **owns or has licensed** the relevant IP; don't use third-party trademarks/copyright without permission, and don't use misleading/copycat names or metadata (5.2.1). ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple IP guidelines for 3rd parties](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html))
- **Google Play Impersonation/IP:** Google doesn't allow apps that infringe trademark/copyright, and **explicitly warns that labeling an app "unofficial" does NOT cure use of another party's trademarks** — using a brand's name/icon/title to drive downloads can be an impersonation violation; consequences include app suspension and **developer account termination**. ([Google Play Impersonation policy](https://support.google.com/googleplay/android-developer/answer/9888374), [Impersonation FAQs](https://support.google.com/googleplay/android-developer/answer/16341334), [Google Play IP policy](https://play.google/developer-content-policy/))

**Implications for Nexus Nook:**
- Do **not** use the Star Citizen / RSI / CIG **logos** or official key art as your app icon, splash, or store imagery.
- Use a **distinct name and icon** ("Nexus Nook"), not "Star Citizen …". You may *describe* it as "a companion for Star Citizen" in the description (nominative reference) with a clear unofficial disclaimer, but avoid branding that implies it **is** the official app. Counsel should review the exact name, icon, and listing copy — this is the single most common rejection/suspension trigger.

### 4.2 Credential harvesting / logging into third-party services
- Apple requires data collection be **directly relevant to core functionality**, with clear consent and a verifiable purpose (5.1.1), and restricts collecting third-party persons' data (5.1.2). Apps asking users for **another service's login credentials** without that service's sanction are a known rejection risk. ([User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/), [Guidelines](https://developer.apple.com/app-store/review/guidelines/))
- Both stores treat **collecting passwords for a third-party service** as high-risk. Combined with §2.3, the conclusion is firm: **do not ask for RSI passwords.** Asking for a **public handle** (a username, not a secret) avoids this entirely.

### 4.3 Privacy policy, account deletion, data disclosure
- **Account deletion (Apple 5.1.1(v)):** any app that lets users create an account **must** offer **in-app account deletion** (not just deactivation), easy to find, deleting the account and associated personal data. ([Account deletion requirement](https://developer.apple.com/news/?id=12m75xbj), [5.1.1(v) thread](https://developer.apple.com/forums/thread/693997))
- **Privacy policy:** required by both stores; must disclose what you collect, how it's used, retention/deletion, and any third parties (including, per Apple's Nov 2025 update, sharing with third-party AI). ([User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/), [Apple Nov 2025 third-party data update](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai/))
- **Data disclosures:** complete Apple "App Privacy" nutrition labels and the Google Play **Data safety** form accurately for everything (handle, saved game data, any analytics).

---

## 5. Recommended compliant architecture for Nexus Nook

1. **Public handle only — no RSI login.**
   - Replace the mock `POST /api/rsi/connect { rsiEmail }` with `POST /api/rsi/connect { rsiHandle }` (a public username, never an email/password).
   - Backend resolves only **publicly visible** profile/org info, and only from a source whose terms allow it. **Do not store or transmit RSI passwords, ever.** Remove the credential TODO from the backend.
   - If even public-profile data can only be obtained by scraping RSI, get the §2.2 ToS question resolved (counsel and/or CIG) **before** shipping that feature; ship ship/trade/reference data (Fleetyards/UEX/SC Wiki) first.
2. **Prefer crowdsourced / Ship-Matrix sources** (Fleetyards, UEX, SC Wiki) over RSI-scraping sources for ship, trade, and reference data. Cache server-side, respect rate limits, send any required `X-Client-Version`/key headers, and back off on errors.
3. **Prominent "unofficial" disclaimer** — in-app (e.g. an About screen + first-run notice) and in **both** store listings, using wording aligned with CIG's Fankit requirement, e.g.:
   > *"Nexus Nook is an unofficial Star Citizen companion app. It is not affiliated with, endorsed by, or sponsored by the Cloud Imperium group of companies. Star Citizen®, Squadron 42®, Roberts Space Industries®, and Cloud Imperium® are trademarks of Cloud Imperium Rights LLC and Cloud Imperium Rights Limited. All related content is the property of its respective owners."*

   (Confirm exact required wording against the live Fankit/Fandom FAQ before launch.)
4. **Distinct branding** — own name/icon, no CIG logos or official art as app identity (§4.1).
5. **Privacy policy + in-app account deletion** — publish a privacy policy URL, implement a clearly reachable in-app "Delete account" flow that erases the account and associated data, and fill in Apple App Privacy + Google Data safety accurately (§4.3).
6. **Attribution** — credit each data source per its license (CC BY-SA 4.0 attribution for SC Wiki content; UEX/Fleetyards attribution as their terms require) on an in-app "Data sources / Credits" screen.
7. **Approach CIG for a blessing/partnership** — once the app is clean and the disclaimer/branding are right, contact CIG (community/fansite channels) to seek explicit permission, a Fankit-aligned sign-off, or partnership. Official blessing is the most durable way to de-risk trademark and data questions. Until then, assume **no** authorization beyond the public Fankit terms.

---

## 6. Do / Don't quick reference

| ✅ Do | ❌ Don't |
|------|---------|
| Ask only for the user's **public RSI handle** | Collect RSI email/password or any RSI login |
| Pull data from community APIs **whose terms permit it**, with attribution | Scrape the RSI website yourself (ToS bot/scraper ban) |
| Use crowdsourced/Ship-Matrix sources (Fleetyards/UEX/SC Wiki) | Rely on RSI-account/org scraping sources without resolving ToS risk |
| Use a **distinct** name & icon ("Nexus Nook") | Use CIG/RSI logos or official art as app identity |
| Show a prominent "unofficial / not affiliated" disclaimer in-app + both stores | Imply you are official, endorsed, or "the" Star Citizen app |
| Ship a privacy policy + in-app account deletion | Offer only "deactivate" or hide deletion |
| Complete Apple App Privacy & Google Data safety accurately | Leave data disclosures vague or wrong |
| Respect each API's rate limits, keys, version headers | Hammer community APIs or ignore their terms |
| Plan to seek CIG's blessing/partnership | Assume the Fankit silently authorizes a monetized app |
| Have a games/IP attorney review before launch | Treat this document as legal advice |

---

## 7. Data-source comparison

| Source | Data | Auth | Rate limits | License / attribution | Scrapes RSI? | Safe to build on? |
|--------|------|------|-------------|-----------------------|--------------|-------------------|
| **UEX Corp** (`uexcorp.space`) | Trade, commodities, prices, terminals, items, ships | API token ("My Apps"); optional `X-Client-Version` | Not published / *unverified* | Crowdsourced; UEX disclaims liability & may restrict/terminate; commercial-use + attribution **unverified** — confirm | No (community reports) | Likely yes for trade data — **confirm terms** |
| **Star Citizen Wiki API** (`api.star-citizen.wiki`) | Ships, stats, comm-links, in-game/lore | Mostly public; some endpoints need Sanctum token | ~60/min search, ~10/min images (per IP) *[verify]* | **CC BY-SA 4.0 — attribution required**; share-alike may apply | Wiki-curated (some scraped/curated) | Yes, with attribution |
| **Fleetyards** (`api.fleetyards.net`) | Ships, components, manufacturers (Ship Matrix) | *Unverified* | *Unverified* | Code **GPLv3**; data terms not spelled out — email maintainer | No (Ship Matrix based) | Likely yes — **confirm terms** |
| **starcitizen-api.com** ("SC-API") | Ships, **Users, Orgs**, `Data.p4k` | API key; live mode consumes key | *Unverified* | Not clearly stated | **Yes — scrapes RSI site** | ⚠️ Caution; inherits RSI anti-scraping risk |
| **pyrsi / RSI-Scraper** | RSI profile/hangar via login/scrape | RSI credentials/scrape | n/a | n/a | **Yes** | ❌ Avoid (ToS + credentials) |
| Community status bots/pages | Server status (best-effort) | Varies | Varies | Varies | Often infers/scrapes | Use only as clearly-labeled "unofficial, best-effort" |

*"Unverified" = could not be confirmed from a source we fully fetched (some terms pages returned 403). Confirm with the provider before launch.*

---

## 8. Pre-launch compliance checklist

**Data & accounts**
- [ ] No RSI password/email collection anywhere in app or backend (mock `connect` endpoint reworked to **public handle only**).
- [ ] No first-party scraping of the RSI website; every data source's terms read and saved.
- [ ] Written confirmation from each community API (UEX, Fleetyards, SC Wiki) that a (potentially monetized) companion app may use their data, and how to attribute.
- [ ] Resolved with counsel/CIG whether any "RSI public profile/org" feature is permissible without violating the anti-scraping ToS.

**Branding & disclaimers**
- [ ] Distinct app name & icon; no CIG/RSI logos or official art as app identity.
- [ ] "Unofficial / not affiliated with Cloud Imperium" disclaimer in-app (first run + About) and in **both** store listings, wording matched to the live Fankit/Fandom FAQ.
- [ ] Trademark attribution line for Star Citizen / Squadron 42 / RSI / CIG marks.
- [ ] Store listing copy reviewed so nothing implies official status.

**Privacy & store policy**
- [ ] Published privacy policy URL (collection, use, retention, deletion, third parties incl. any AI/analytics).
- [ ] In-app account deletion (Apple 5.1.1(v)) — easy to find, deletes account + data.
- [ ] Apple App Privacy labels + Google Play Data safety form completed accurately.
- [ ] Data collection minimized to what's directly relevant (Apple 5.1.1).

**Attribution & governance**
- [ ] In-app "Data sources / Credits" screen attributing each source per its license (CC BY-SA 4.0 for SC Wiki content, etc.).
- [ ] Rate-limit/backoff and required headers/keys implemented for each API.
- [ ] **A qualified games/IP attorney has reviewed the app, listings, privacy policy, and data sources.**
- [ ] Plan (or initial contact) to seek CIG's blessing/partnership documented.

---

## 9. Open questions to confirm (do not guess)

- Exact, current required disclaimer wording from the **live** RSI Fankit / Fandom FAQ (our excerpts may be paraphrased/outdated).
- The current RSI ToS bot/scraper and account-transfer clause text verbatim (page 403'd to our fetcher).
- UEX, Fleetyards terms on **commercial use, attribution format, and redistribution** in a monetized app.
- Whether SC Wiki's CC BY-SA share-alike creates obligations when their data is bundled/displayed in a closed-source app.
- Whether CIG would object to a monetized (ads/subscription) companion app, and whether a partnership/sanction is obtainable.

---

### Sources
- RSI Fankit & Fandom FAQ — https://support.robertsspaceindustries.com/hc/en-us/articles/360006895793-Star-Citizen-Fankit-and-Fandom-FAQ
- RSI Fandom FAQ (videos/writing) — https://support.robertsspaceindustries.com/hc/en-us/articles/115013196127-Fandom-FAQ-Videos-writing-and-more
- RSI Fan Film & Machinima Policy — https://support.robertsspaceindustries.com/hc/en-us/articles/5422808416151-Fan-Film-and-Machinima-Policy
- RSI Fankit — https://robertsspaceindustries.com/en/fankit
- RSI Terms of Service — https://robertsspaceindustries.com/en/tos and https://robertsspaceindustries.com/en/tos/8
- RSI EULA — https://robertsspaceindustries.com/en/eula
- pyrsi — https://pypi.org/project/pyrsi/ ; RSI-Scraper — https://github.com/Dymerz/RSI-Scraper
- UEX API docs — https://uexcorp.space/api/documentation/ ; UEX terms — https://uexcorp.space/about/terms ; UEX community tools — https://uexcorp.space/api/community_made/
- Star Citizen Wiki API — https://api.star-citizen.wiki/ ; Swagger — https://docs.star-citizen.wiki/ ; API repo — https://github.com/StarCitizenWiki/API ; disclaimer/license — https://starcitizen.tools/Star_Citizen_Wiki:General_disclaimer ; API info — https://starcitizen.tools/Star_Citizen_Wiki:Application_programming_interface
- Fleetyards API — https://api.fleetyards.net/v1/ ; docs — https://docs.fleetyards.net/ ; repo/README — https://github.com/fleetyards/fleetyards/blob/main/README.md
- starcitizen-api.com — https://starcitizen-api.com/ ; getting started — https://starcitizen-api.com/startup.php
- Apple App Review Guidelines — https://developer.apple.com/app-store/review/guidelines/ ; IP guidelines for 3rd parties — https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html
- Apple account-deletion requirement — https://developer.apple.com/news/?id=12m75xbj ; 5.1.1(v) thread — https://developer.apple.com/forums/thread/693997
- Apple User Privacy and Data Use — https://developer.apple.com/app-store/user-privacy-and-data-use/ ; Apple Nov 2025 third-party data update — https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai/
- Google Play Impersonation — https://support.google.com/googleplay/android-developer/answer/9888374 ; Impersonation FAQs — https://support.google.com/googleplay/android-developer/answer/16341334 ; Developer Policy Center — https://play.google/developer-content-policy/
- OAuth / not taking user passwords — https://www.infosecinstitute.com/resources/industry-insights/third-party-authentication-oauth-good-or-bad-for-security/ ; OAuth mobile best practices — https://curity.io/resources/learn/oauth-for-mobile-apps-best-practices/
- RSI Status community bot — https://robertsspaceindustries.com/community-hub/post/rsi-status-discord-bot-spa6m7lnlgywj

*Compiled June 2026. Re-verify all sources before relying on them. Not legal advice.*
