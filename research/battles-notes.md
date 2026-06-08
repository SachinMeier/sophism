# Historical Battles Research Notes

Target count: 500 cards, grown in vetted priority batches.

Production count: 500 cards in `data/battles.json`.
Casualties coverage: 294 cards include an optional `details.casualties` display string; 206 omit it pending row-level casualty sourcing. Of the included casualty fields, 30 currently use side-by-side display strings.

The first pass intentionally balanced across era, continent, and battle type. Later passes should prioritize the most consequential and well-known omitted battles first, then use regional, chronological, and battle-type balance as secondary constraints.

User-provided starting source: https://en.wikipedia.org/wiki/List_of_battles_by_casualties

Use this page as a discovery seed, not as final authority. The page itself flags citation and sorting problems, and it mixes battles, sieges, urban fighting, major operations, raids, sacks, and naval actions. That breadth is useful for candidate discovery, but every promoted card still needs exact event-level sources and image attribution.

## Selection Rules

- Use the manifest filter values exactly: Africa, Asia, Europe, North America, South America, Oceania.
- Use the manifest epoch values exactly: Ancient, Medieval, Early Modern, Modern, World Wars, Contemporary.
- Treat battles, sieges, major naval actions, and named operations as eligible when the learner can study them as a discrete event.
- Include casualties in research rows and final card details only as an optional display string.
- Prefer side-by-side casualty display strings when trustworthy source data is available, for example `Germany: 10,000; United States: 5,000`, because they are more useful than a single combined total.
- Treat `details.combatants` as opposing display sides. Coalition members should be grouped into a single side string, for example `Macedon` versus `Athens and Thebes`.
- Use series for wars, campaigns, theaters, or tightly connected crisis sequences. Avoid broad theme buckets such as generic revolutions, imperial expansion, colonial wars, or urban warfare when the cards belong to clearly different conflicts.
- Prefer rows with a public-domain painting, map, artifact, battlefield photograph, or official military-history image.
- Write glosses from cross-checked facts, not copied page summaries.

## Known Curation Risks

- Some modern and contemporary battles have strong source coverage but limited reusable images.
- Some events are better understood as campaigns. Keep them only if the final card can name a specific event and present a clear image.
- Pacific battles are assigned to Oceania for deck balance when they are island or oceanic theater actions, even when combatants came from elsewhere.
- Ancient and medieval locations may need display strings that avoid implying modern national borders too strongly.
- Casualty-count prominence can overrepresent modern industrial warfare. Keep historically important lower-casualty rows when they improve learning balance.
- Casualty figures need scope labels. Record whether a figure includes killed only, wounded, missing, prisoners, civilians, or total casualties when the source makes that clear; split by side whenever the source makes that split clear.

## Next Actions

1. Verify every row in `candidates/battles.tsv` against at least one encyclopedia or official military-history source beyond Wikipedia.
2. For each requested growth pass, add the highest-significance omissions before adding lower-impact balance rows.
3. Keep existing production cards unless the user explicitly asks to remove or replace them.
4. Recheck series ordering whenever a new card is inserted into an existing war, campaign, or thematic series.
5. Run `node research/scripts/normalize-battle-series.mjs` and `node research/scripts/normalize-battle-combatants.mjs` before promotion if older add scripts or manual edits touch battle details data.
