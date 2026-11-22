# Sticker illustrations

Generated in Higgsfield with `gpt_image_2_6`, 1:1, then cropped to a transparent circle with `tools/sticker.py`.

## Style rules

- Circular composition on plain off-white (#F4F1EA).
- Flat mid-century screen-print / linocut look, bold shapes, light paper grain, no gradients.
- Brand palette only: Night Sky #092A4D, Dark Forest #1B4532, Sand #D1CCBD, Deep Orange #E7805D, Sunset Yellow #F9D635, Gray Sky #99ADC5, off-white.
- No text, letters, numbers or logos (names and dates live in the cancellation, set in Dharma Gothic).
- No people.
- **Buildings:** for historic sites the building is the subject (Matt's direction, Nov 2026). Use a public-domain or CC0 photo as the reference image where one exists (Sagamore Hill: HABS NY-6051, Library of Congress; Inaugural Site: CC0 Wikimedia photo) so the architecture is accurate. Don't use CC BY-SA photos as references.
- **Indigenous cultural sites** (Chaco, Mesa Verde, Gila, Tonto, Montezuma Castle, El Morro, Hubbell): architecture and landscape only; no invented rock art, symbols or people. These go to the Library's reviewers before launch.

## Prompt template

```
Circular vintage national park stamp illustration, contained in a perfect circle on a plain
off-white (#F4F1EA) background. Scene: <SCENE>. STYLE: flat mid-century screen-print / linocut
poster illustration, bold simple shapes, subtle paper grain, no gradients, limited palette of
only: Night Sky navy #092A4D, Dark Forest green #1B4532, Sand #D1CCBD, Deep Orange #E7805D,
Sunset Yellow #F9D635, Gray Sky blue #99ADC5, off-white. Absolutely NO text, letters, numbers,
logos. No people, no buildings.
```

## Scenes

The 72 national-park and T.R.-site scenes added in November 2026 are in `tools/scenes.json`. The first 12:

| Site | Scene |
|---|---|
| thro | Badlands buttes, Little Missouri, cottonwoods, bison |
| sahi | Hilltop oaks over Oyster Bay, sailboat |
| thrb | 1850s gas lamp, iron railing, cobbles, toy boat, bird notebook |
| thri | Buffalo autumn maples, bunting on a fence rail |
| yell | Old Faithful, hot-spring terraces, bison |
| grca | Canyon at sunset, juniper, condor |
| deto | Devils Tower over pines and the Belle Fourche, dusk |
| crla | Crater Lake, Wizard Island, hemlocks |
| meve | Mesa top, sandstone alcoves (no dwellings), golden eagle |
| wica | Prairie with bison and prairie dogs over boxwork cave cutaway |
| muwo | Redwoods, light through fog, ferns, creek |
| pefo | Painted Desert bands, petrified logs, raven |
