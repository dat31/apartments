# Design brief: a home described in more than one language

> For Claude Design, which has this project synced. It covers only this
> feature — what it has to let people do, the flow through it, and the rules
> behind it. Everything else about the product is in the code.
>
> A **product brief, not a handoff**: no layout, no components, no technical
> requirements. What to build, not how.
>
> A first answer to both surfaces already ships — the listing form offers a tab
> per language with the original marked, and the detail page adds a line under
> a description that fell back. One answer, not the answer.

---

## 1. The requirement

A home's title and description are the only two things on a listing written by
a person rather than by the app. They exist in one language: whichever one the
owner typed. Every English-reading renter therefore meets Vietnamese-only
homes, and the demo data's workaround — both languages crammed into one
title — showed *every* renter a language they hadn't asked for.

Two things have to become true:

- An owner can say the same home in another language, **without that being a
  condition of publishing.** Many owners write no English at all, and a
  listing that never gets posted helps nobody.
- A renter always gets the best version that exists, **and knows which version
  they got.**

## 2. What the owner must be able to do

Capabilities, not layout. How these are arranged, revealed or sequenced is
open.

- **Publish writing one language only.** Never blocked, never nagged into a
  second one as a condition of going live.
- **Write the title and description again in another language**, at any point —
  while first creating the home, or months after it went live.
- **Understand what renters see if they don't**, before deciding, rather than
  discovering it later.
- **See which languages a home already has** on return, without opening each
  one to find out.
- **Change their mind:** fix a translation, or remove it and let the home go
  back to one language.
- **Always get their own words back when editing.** What an owner typed is what
  they should see. Their own words in another language must never be presented
  as the thing they wrote first — that is how originals get overwritten.
- **Know which language is this home's original** — the one that stands in
  wherever nothing else exists.

## 3. What the renter must get

- **The home in the language they are reading the site in**, whenever the owner
  wrote one.
- **The original rather than nothing**, when the owner didn't. Never a blank,
  never a placeholder, never a home that looks unfinished because of a language
  it was never written in.
- **To know when they're reading a fallback, and why.** "The owner hasn't
  written one" is a fact about a person, not a failure of the app — and a page
  that silently switches language on a reader looks broken.
- **To find the home by searching in either language.** An English search has
  to find a home written only in Vietnamese, and the reverse. This is the part
  most likely to be quietly dropped, and the one renters notice first when it's
  missing.
- **Not to be told about languages they didn't ask about.** Whether a home has
  a translation is not interesting on a card, in a results list, or on a
  shortlist.

## 4. The logic behind it

The part that isn't visible from the outside, and the part most likely to be
got wrong.

**Every home has an original, and it never disappears.** Whatever language the
owner wrote first is what the home falls back to. Other languages sit on top of
it, never replace it. Which language that is depends on the person, not on a
rule — some owners write English first.

**Title and description fall back independently.** A translated title above an
untranslated description is normal, common, and correct — not a half-broken
state to hide or complete. A home may legitimately show its name in English and
its story in Vietnamese on one screen.

**Empty means "not written", never "the owner said nothing".** Clearing a
translation restores the original. It must never blank out a home.

**Only those two fields are in play.** Everything else on a listing is either
app words that already exist in both languages, or language-neutral.

**The owner's surfaces speak the owner's language.** Anywhere they manage their
homes shows what they typed, not a translated version of it.

**Search reads every language at once, before anything is chosen for display.**
That produces a pairing which has to feel deliberate rather than buggy: a
renter types English words and gets back a home whose card is in Vietnamese,
because the match came from copy they aren't being shown.

**Notifications speak the reader's language, not the URL's.** An alert about a
new matching home names it in whichever language that subscriber chose.

**Two languages is today's number, not the design's.** A third can be added
later. Nothing may assume "the other language" is singular, that there's a
natural pair, or that one particular language is the default.

**Nobody writes twice to publish.** Only the original title is ever required.

## 5. States that need designing

- **Never translated** — the majority of homes, and the state that decides
  whether an owner ever starts. Both sides of it.
- **Partly translated** — a title but no description.
- **Just written a translation** — did it save, and where does it show up?
- **A translation removed**, and the home back to one language.
- **Editing a live home** that renters are reading in two languages right now.
- **The home's original isn't the language the owner is currently using the
  site in** — a Vietnamese owner browsing in English, editing their Vietnamese
  home. The home's language and the reader's language are independent, and this
  is where that bites.
- **A result matched through words the reader can't see.**
- **The original is already the reader's language** — nothing should happen at
  all. No line, no badge, no chrome.

## 6. Questions worth an opinion from design

1. **How does an owner find out this is possible?** Nothing announces it today.
   A quiet affordance risks nobody using it; an active prompt risks pressuring
   owners who genuinely cannot write the other language.
2. **Is there an honest reason to translate that could be shown?** How many
   people read this home in English would persuade better than any nudge — if
   it's true and available.
3. **Should a renter be able to reach the original when a translation exists?**
   Some read both; an owner's own English can be better or worse than their
   Vietnamese.
4. **Does "this home has an English version" belong anywhere in a list?** Cards
   say nothing today, deliberately. That may be right, or it may be hiding
   something a renter would filter on.
5. **How loud should the fallback notice be?** For an English reader it will
   appear on most homes for a long while. Too loud is noise on every page; too
   quiet reads as the app changing language for no reason.
6. **How should an owner see the state across all their homes?** "Three of five
   translated" is either useful or guilt-inducing, and the difference is
   entirely in how it's said.
7. **Should removing a translation be confirmed?** It is one action away from
   deleting writing the owner may not be able to reproduce.
8. **Is the language a home was written in ever worth showing a renter
   directly** — as provenance about the home, rather than as an apology for a
   fallback?

## 7. Out of scope

Machine translation of any kind. Translating what renters write — reviews and
messages. Translating owner profiles and bios. Adding a third language: the
design should survive one, but nobody is asking for one now.

---

Success looks like: an owner who writes only Vietnamese publishes exactly as
easily as before; an English-reading renter stops meeting homes they can't
read; a renter who lands on a fallback understands at a glance that a person
didn't write it, rather than wondering whether the site is broken.
