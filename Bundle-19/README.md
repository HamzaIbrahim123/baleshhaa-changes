# Bundle 19 — 90 Countries & Capitals questions, image credits

**Already applied to Neon directly:**
- Category **دول وعواصم** (existing ID `d40e19a9-7f4f-9ae7-9ecd-a662031aa48f`) now has 90 published questions.
- 30 questions at 200, 30 at 400, 30 at 600.
- 15 questions use UUID-linked landmark images, 5 at each level; 75 text only.
- 15 actual licensed JPEGs are stored in Neon Object Storage under `baleshhaa-public-media/capitals/v1/<country_code>.jpg`, with stable UUIDs in `app_media`.
- Image authors, license labels and Wikimedia Commons file pages are kept in `app_media.credit_author`, `credit_license`, `credit_source_url`.
- No question about the expressly excluded subject.
- Questions remain in `app_questions`; image links in `image_id` and never hardcoded in React.
- Confirmed 15 / 15 images served via HTTP, all image links valid, no missing photo credits.
- Total published quiz questions across the database: 1170.

**Already deployed to Neon**:
- `baleshhaagame` deployment v3 now returns optional `imageAttribution` object when opening image questions, while retaining old logic and `imageId`.

**Figma Make ZIP** contains only:
- `src/LiveMatch.tsx`: adds clickable image attribution under relevant question image
- `src/liveApi.ts`: types the optional attribution
- `src/live-match.css`: responsive readable credit line

Upload `FigmaMake-Changes-Only.zip` into the **existing Figma Make project**, replacing these three files only. Do not upload backend source.

Image credits are linked to original Wikimedia Commons file pages and appear alongside CC photo attribution during the question. Copyright/photo licensing data for future image banks should similarly be stored in `app_media`.

**Verification limitations:** Static frontend checks and Neon production database/API deployment state verified. A live interactive browser test of playing a photo question after Figma Make import remains to be performed. Existing gameplay rules, user usage, and accounts have not been modified.

Do not re-run database imports: all data is already live.
