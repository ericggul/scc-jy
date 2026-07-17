# SNS LinkedIn 1

Route: `/sns/linkedin/1`

## Intent and design basis

LinkedIn 1 is a responsive reconstruction of the current signed-in LinkedIn
home feed, with priority given to the large desktop composition and a distinct
mobile feed rather than a compressed desktop page. It is separate from the
other SNS experiments and makes no claim to connect to LinkedIn or reproduce
its recommendation systems.

1. **Participant situation:** a professional is catching up with their
   network, deciding what deserves a response, and moving between a large work
   screen and a phone.
2. **Primary parameter:** professional relevance — the relationship between a
   post, its author, its social context, and the actions available beneath it.
3. **Perceptual job:** make authored updates, connection distance, social
   proof, engagement, news, and suggested professional relationships legible
   at a glance.
4. **Interaction job:** search the local feed, change sort order, open and
   publish from the composer, like, repost, begin commenting, connect with a
   suggested person, open persistent messaging, and send a local message.
5. **Wrapper justification:** these are direct network/feed tasks. The
   recognizable LinkedIn grammar — an economical neutral canvas, dense
   textual metadata, blue action emphasis, and carefully bounded white
   modules — makes the relations legible without inventing a themed shell.
6. **System family:** desktop and mobile share member, post, reaction, and
   navigation records. Desktop uses the current multi-column feed and
   lower-right messaging window; mobile uses a full-width feed, compact search
   header, and five-position bottom navigation.
7. **Removal test:** the cover, profile summary, composer, context line, post
   controls, news, suggestions, mobile navigation, and messaging dock each
   support a recognisable LinkedIn task. No decorative dashboard badges,
   metrics, explanatory captions, or fictional live status are added.

### Applied UI rules

- **Desktop:** a fixed 52px white global bar contains the compact mark,
  blue-tinted search field, six primary navigation positions, account menu,
  and business entry. The content canvas is a measured
  `225px / 555px / 300px` grid at the conventional 1128px wide breakpoint.
  The left rail is a compact profile card and recent items; the central feed
  has the actual composer / sort / post rhythm; the right rail combines
  LinkedIn News, people recommendations, and a small current puzzle surface.
  The familiar conversation window persists at lower right rather than
  turning messages into a new page.
- **Post treatment:** author metadata stays compact above readable text,
  context appears only where it explains why the post is surfaced, media fills
  the content width, and social proof and Like/Comment/Repost/Send sit at the
  bottom. Reactions, reposts, comments, connects, the sort control, search,
  composer, and messages change meaningful local state.
- **Feed continuity:** following the established YouTube 2 convention, the
  feed begins with six records and appends six deterministic entries whenever
  the reader comes within 920px of the document end. The source post IDs plus
  the batch index create stable React keys, so an unbounded local feed never
  relies on mutable display strings as keys. Search and sort reset the visible
  batch to six entries. The initial feed source contains 20 individually
  authored records across 18 people and organisations before deterministic
  cycling begins.
- **Mobile:** the visual system switches at 760px. It has a 56px search bar
  between profile and message actions, edge-to-edge post surfaces with short
  grey feed intervals, icon-first post actions, and a fixed bottom rail.
  Desktop side rails and the desktop conversation window are intentionally
  removed; they are not scaled down into an unusable phone layout.
- **Media:** all member and feed images are public Unsplash photos rendered
  through the existing permitted Next Image host. They supply visual density
  without exposing account data or asserting that a real member posted them.
- **Implementation:** static domain records live in
  `components/sns/linkedin/1/model/`; the locally interactive client screen,
  custom SVG icon set, and scoped CSS live in `screen/`. The shared SNS dynamic
  route registers the experiment through `components/sns/experiments.ts`.

## Research ledger — accessed 2026-07-17

The implementation followed a research pass of **56 current LinkedIn
interface records**: 45 official Help pages describing the signed-in desktop
and mobile flows (many include current UI snapshots) and 11 additional visual
captures / interface studies. The core desktop feed, message pop-up, mobile
navigation, newer natural-language search, current job tracker, and current
post/repost behaviour were cross-checked across the current records below.
Older historical captures were excluded from the visual rules where they
contradicted current help material.

1. [Search for jobs on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a511260/applying-for-a-job-on-linkedin?lang=en)
2. [LinkedIn Homepage — Overview](https://www.linkedin.com/help/linkedin/answer/a523215/homepage-overview?lang=en)
3. [LinkedIn Messaging conversation windows](https://www.linkedin.com/help/linkedin/answer/a569449)
4. [LinkedIn’s Job Library](https://www.linkedin.com/help/linkedin/answer/a7449405)
5. [LinkedIn Messaging — FAQ](https://www.linkedin.com/help/linkedin/answer/a550206/linkedin-messaging-faq?intendedLocale=en&lang=en-us)
6. [Send messages to connections on LinkedIn Messaging](https://www.linkedin.com/help/linkedin/answer/a541865)
7. [Job recommendations based on your preferences and profile](https://www.linkedin.com/help/linkedin/answer/a512279/)
8. [LinkedIn Feed — Overview](https://www.linkedin.com/help/linkedin/answer/a523360/linkedin-feed-overview?lang=en)
9. [Send an InMail Message](https://www.linkedin.com/help/linkedin/answer/a546814)
10. [Track and organize job opportunities](https://www.linkedin.com/help/linkedin/answer/a8684146)
11. [Jobs tab of your LinkedIn Page](https://www.linkedin.com/help/linkedin/answer/a567373)
12. [Sort your feed by Top or Recent posts](https://www.linkedin.com/help/linkedin/answer/a1480504)
13. [Remove Suggestions from People You May Know](https://www.linkedin.com/help/linkedin/answer/a550116)
14. [Manage your LinkedIn feed preferences](https://www.linkedin.com/help/linkedin/answer/a528074/manage-your-linkedin-feed-preferences?lang=en)
15. [Share profile updates with your network](https://www.linkedin.com/help/linkedin/answer/a529062/share-profile-updates-with-your-network?lang=en)
16. [Search for people on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a525054/search-for-people-on-linkedin?lang=en)
17. [Your LinkedIn profile](https://www.linkedin.com/help/linkedin/answer/a564064/your-linkedin-profile-overview?lang=en)
18. [Share videos on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a7486279)
19. [Manage your profile’s visibility on and off LinkedIn](https://www.linkedin.com/help/linkedin/answer/a548106/managing-your-profile-s-visibility-on-and-off-linkedin)
20. [Search on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a523136/search-on-linkedin?lang=en)
21. [Post and share updates](https://www.linkedin.com/help/linkedin/answer/a528176)
22. [Select invitations and notification types](https://www.linkedin.com/help/linkedin/answer/a1341808)
23. [Edit the Introduction section on your profile](https://www.linkedin.com/help/linkedin/answer/a547248)
24. [Manage your LinkedIn notification updates](https://www.linkedin.com/help/linkedin/answer/a597801/managing-your-linkedin-notification-updates?lang=en)
25. [How to repost on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a525047/how-to-repost-on-linkedin?lang=en)
26. [Turn on automatic invitations to follow your LinkedIn Page](https://www.linkedin.com/help/linkedin/answer/a6232587)
27. [Invite connections to follow your LinkedIn Page](https://www.linkedin.com/help/linkedin/answer/a1308772)
28. [Personalize invitations to connect](https://www.linkedin.com/help/linkedin/answer/a563153/personalizing-invitations-to-connect?lang=en)
29. [View your activity or a member’s activity on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a546122/viewing-recent-activity?lang=en)
30. [Follow or unfollow people](https://www.linkedin.com/help/linkedin/answer/a524326/following-and-unfollowing-people-companies-or-topics?lang=en)
31. [Add or remove profile content from the Featured section](https://www.linkedin.com/help/linkedin/answer/a1584656)
32. [Manage who can follow you settings](https://www.linkedin.com/help/linkedin/answer/a528014)
33. [Who can see your connections](https://www.linkedin.com/help/linkedin/answer/a540663/who-can-see-your-connections?lang=en)
34. [View your connections](https://www.linkedin.com/help/linkedin/answer/a566261/view-your-connections?lang=en)
35. [Add a follow link or button to your profile](https://www.linkedin.com/help/linkedin/answer/a762822)
36. [How to repost a comment](https://www.linkedin.com/help/linkedin/answer/a14560261)
37. [Subscribe or unsubscribe to newsletters](https://www.linkedin.com/help/linkedin/answer/a1644939)
38. [Apply to jobs directly on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a512348?lang=en_US)
39. [LinkedIn Newsletter access criteria](https://www.linkedin.com/help/linkedin/answer/a596269/)
40. [Apply for jobs on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a512388/applying-for-jobs-on-linkedin?lang=en)
41. [Manage jobs you saved on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a513247/managing-jobs-you-saved-on-linkedin?lang=en)
42. [How LinkedIn uses your job application information](https://www.linkedin.com/help/linkedin/answer/a507694/save-your-job-application-information?lang=en)
43. [Find jobs on LinkedIn — Best Practices](https://www.linkedin.com/help/linkedin/answer/a509393)
44. [Like, unlike, and react to posts or comments](https://www.linkedin.com/help/linkedin/answer/a522684/like-unlike-and-react-to-posts-or-comments?lang=en)
45. [Job alerts on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a511279/)
46. [LinkedIn desktop interface overview — Usability Design Critique](https://lenaviz.medium.com/usability-design-critque-linkedin-6be109e0a2f3)
47. [LinkedIn desktop interface overview — Respona](https://respona.com/blog/find-emails-on-linkedin/)
48. [LinkedIn desktop navigation and feed capture — Guiding Tech](https://www.guidingtech.com/linkedin-notifications-not-working-try-these-fixes/)
49. [LinkedIn desktop message-window capture — Revive Social](https://revive.social/linkedin-messages/)
50. [LinkedIn mobile feed / navigation capture — SocialPilot](https://www.socialpilot.co/blog/new-linkedin-features-and-updates)
51. [LinkedIn mobile AI search and feed capture — Infobae](https://www.infobae.com/tecno/2025/11/14/linkedin-ahora-permite-buscar-personas-con-ayuda-de-la-inteligencia-artificial/)
52. [LinkedIn mobile profile, feed, and people suggestions — Executive Headshots](https://executiveheadshots.com/linkedin-statistics)
53. [LinkedIn mobile profile/feed/suggestions capture — El Heraldo](https://www.elheraldo.hn/utilidad/empleos/mejore-su-perfil-de-linkedin-puntos-clave-para-optimizar-sus-oportunidades-IK14871801)
54. [LinkedIn mobile feed current features — Social Media Examiner](https://www.socialmediaexaminer.com/linkedin-mobile-with-viveka-von-rosen/)
55. [LinkedIn feed composition — LinkedIn News](https://news.linkedin.com/2019/January/what-s-in-your-linkedin-feed--people-you-know--talking-about-thi)
56. [LinkedIn mobile interface examples — MacMagazine](https://macmagazine.com.br/post/2015/12/02/linkedin-para-ios-ganha-o-update-que-merecia-ha-bastante-tempo/)

## Files

- `components/sns/linkedin/1/model/types.ts`
- `components/sns/linkedin/1/model/data.ts`
- `components/sns/linkedin/1/screen/icons.tsx`
- `components/sns/linkedin/1/screen/index.tsx`
- `components/sns/linkedin/1/screen/linkedin.module.css`
- `components/sns/linkedin/1/index.ts`
- `components/sns/experiments.ts`
- `app/sns/[category]/[experiment]/page.tsx`

The experiment is intentionally self-contained: it uses static, stable record
IDs and local presentation state only, so its visual/interaction behaviour can
be compared cleanly with the existing SNS experiments.
