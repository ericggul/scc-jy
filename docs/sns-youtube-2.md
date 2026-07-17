# SNS YouTube 2

Route: `/sns/youtube/2`

## Intent and design basis

YouTube 2 is a separate, mobile-first reconstruction of the contemporary
YouTube viewing experience. It does not modify YouTube 1. The supplied mobile
references are the primary visual authority: black watch/feed surfaces, a
full-width 16:9 media flow, small neutral metadata, thin red progress, compact
rounded action controls, and the five-part bottom navigation are treated as
the non-negotiable visual grammar.

1. **Participant situation:** someone is moving between a phone feed and a
   larger browser while deciding what to start, continue, save, or share.
2. **Primary parameter:** the current video and its watch position.
3. **Perceptual job:** distinguish new, in-progress, live, selected, and
   queued viewing states without inserting dashboard chrome.
4. **Interaction job:** search, filter, open, scrub, play/pause, mute, enter
   full screen, subscribe, like, save, download, share, queue, and return to
   browsing through a mini-player.
5. **Wrapper justification:** these are ordinary video-platform tasks, so the
   established YouTube watch/feed grammar is functional rather than thematic.
6. **System family:** mobile uses the supplied dark interface; large screens
   use the same record geometry in the current web guide/search/grid/watch-next
   structure. Video remains visually dominant in both.
7. **Removal test:** no hero, decorative cards, dividers, fake analytics,
   captions, badges, or footer content are present. Remove a control only if
   it no longer changes a real local viewing state.

### Applied UI rules

- Mobile home: fixed compact header, horizontally scrollable topic chips,
  an inline now-playing player above the feed, full-width 16:9 cards, two-line
  title hierarchy, avatar-aligned metadata, duration/live labels, watched
  progress, and the five action positions: Home, Shorts, Create,
  Subscriptions, You. The mobile brand is intentionally the play mark only;
  the full wordmark remains on desktop.
- Watch: a dark media player with tap-revealed controls, a slim scrubber,
  exact `m:ss`/`h:mm:ss` display, mute, full screen, channel subscribe action,
  large mobile-only circular action controls, an expandable description,
  interactive comments sheet/composer, and an Up next list. Desktop retains
  compact labelled action pills where horizontal room is available.
  It removes the mobile feed header, and its down control returns to browsing
  through the mini-player rather than leaving the viewer at a stale scroll
  position.
- Desktop: current compact header/search, collapsible guide, responsive
  thumbnail grid, and a dedicated Watch Next column rather than a mobile
  layout stretched wide.
- Continuity: opening a video starts local playback, scrolls to the top, and
  sets `?v=<video-id>`. Direct links and browser history restore the watch
  view. Leaving it exposes a working mini-player that can be dragged and
  double-clicked between compact and expanded widths.
- The implementation models UI state locally. It makes no claim to stream
  remote YouTube videos, fetch user data, or reproduce service-side ranking.

## Research ledger — accessed 2026-07-17

The implementation is based on the supplied five app captures plus the 56
distinct sources below. Sources 1–47 are currently served Help/Store materials
or 2025–26 product information; 48–56 are retained as official change records
where they explain a UI pattern still visible in the current product.

1. [YouTube on Google Play](https://play.google.com/store/apps/details?id=com.google.android.youtube)
2. [Find your way around YouTube — Android](https://support.google.com/youtube/answer/2398242?co=GENIE.Platform%3DAndroid&hl=en)
3. [Create and manage a custom Home feed](https://support.google.com/youtube/answer/17081258?hl=en)
4. [YouTube test features and experiments](https://support.google.com/youtube/thread/18138167?hl=en)
5. [Watch videos in the Miniplayer — Android](https://support.google.com/youtube/answer/9162927?co=GENIE.Platform%3DAndroid&hl=en)
6. [Watch videos in the Miniplayer — Computer](https://support.google.com/youtube/answer/9162927?hl=en-9)
7. [Use the inline player — Android](https://support.google.com/youtube/answer/7640367?co=GENIE.Platform%3DAndroid&hl=en)
8. [Change video player size — Computer](https://support.google.com/youtube/answer/6052392?hl=en)
9. [Queue videos on YouTube — Computer](https://support.google.com/youtube/answer/9546304?hl=en-US)
10. [Speed up or slow down videos — Android](https://support.google.com/youtube/answer/7509567?co=GENIE.Platform%3DAndroid&hl=en)
11. [Chapters and precise seeking — Android](https://support.google.com/youtube/answer/12825599?co=GENIE.Platform%3DAndroid&hl=en)
12. [Keyboard shortcuts for YouTube](https://support.google.com/youtube/answer/7631406?hl=en-EN)
13. [Dark theme and Ambient mode — Android](https://support.google.com/youtube/answer/7385323?co=GENIE.Platform%3DAndroid&hl=en-uk)
14. [View, organize, or delete comments](https://support.google.com/youtube/answer/6000976?hl=en)
15. [Explore comment topics](https://support.google.com/youtube/answer/14239105?hl=en)
16. [Comments not showing or removed — Android](https://support.google.com/youtube/answer/13209064?co=GENIE.Platform%3DAndroid&hl=en)
17. [Review and reply to comments — Android](https://support.google.com/youtube/answer/9482367?co=GENIE.Platform%3DAndroid&hl=en)
18. [Subscribe to channels — Android](https://support.google.com/youtube/answer/4489286?co=GENIE.Platform%3DAndroid&hl=en)
19. [Subscribe to channels — iPhone and iPad](https://support.google.com/youtube/answer/4489286/subscribe-to-channels-android?co=GENIE.Platform%3DiOS)
20. [Auto-play videos](https://support.google.com/youtube/answer/6327615?hl=en-GB)
21. [Why YouTube asks “Continue watching?”](https://support.google.com/youtube/answer/12819304?hl=en)
22. [Add and remove Watch later — Android](https://support.google.com/youtube/answer/56101?co=GENIE.Platform%3DAndroid&hl=en)
23. [Add and remove Watch later — Computer](https://support.google.com/youtube/answer/56101?hl=en)
24. [Create and manage playlists — Android](https://support.google.com/youtube/answer/57792?co=GENIE.Platform%3DAndroid&hl=en)
25. [Save playlists — Computer](https://support.google.com/youtube/answer/4541577)
26. [Save playlists — Android](https://support.google.com/youtube/answer/4541577?co=GENIE.Platform%3DAndroid&hl=en-Gb)
27. [Share videos and channels — Android](https://support.google.com/youtube/answer/57741?co=GENIE.Platform%3DAndroid&hl=en-IE)
28. [Share videos and channels — Computer](https://support.google.com/youtube/answer/57741?hl=en-GB)
29. [Video sharing and messaging — Android](https://support.google.com/youtube/answer/16650958)
30. [Expanded in-app video sharing and messaging — June 2026](https://blog.youtube/news-and-events/youtube-in-app-video-sharing-messaging/)
31. [Create and manage clips — Android](https://support.google.com/youtube/answer/10332730?co=GENIE.Platform%3DAndroid&hl=en-gb)
32. [Watch offline with Premium — Android](https://support.google.com/youtube/answer/11977233?co=GENIE.Platform%3DAndroid&hl=en)
33. [Watch offline in select regions — Android](https://support.google.com/youtube/answer/6141269?co=GENIE.Platform%3DAndroid&hl=en)
34. [YouTube videos offline FAQ](https://support.google.com/youtube/answer/7381437?hl=en)
35. [Upload YouTube videos — Android](https://support.google.com/youtube/answer/57407?co=GENIE.Platform%3DAndroid&hl=en)
36. [Advanced search filters — Android](https://support.google.com/youtube/answer/111997?co=GENIE.Platform%3DAndroid&hl=en)
37. [Watch YouTube Shorts — Computer](https://support.google.com/youtube/answer/12319243?hl=en-uk)
38. [Learn about Live Chat](https://support.google.com/youtube/answer/15268877?hl=en)
39. [Watch YouTube on TV by linking devices](https://support.google.com/youtube/answer/7640706?co=GENIE.Platform%3DAndroid&hl=en-EN)
40. [Explore the YouTube app on TV](https://support.google.com/youtube/answer/7583931?hl=en)
41. [YouTube search and discovery performance FAQ](https://support.google.com/youtube/answer/141805?hl=en)
42. [Manage recommendations and search results](https://support.google.com/youtube/answer/6342839?hl=en-0)
43. [YouTube recommendation system](https://support.google.com/youtube/answer/16533387?hl=en)
44. [How YouTube recommendations work](https://support.google.com/youtube/answer/16089387?hl=en-ca)
45. [Remove recommended content from Home](https://support.google.com/youtube/answer/6125535?hl=)
46. [Content performance for recommendations](https://support.google.com/youtube/answer/16559650?hl=en)
47. [Video and audio quality enhancements](https://support.google.com/youtube/answer/16619284?hl=en)
48. [YouTube features and updates 2024](https://blog.youtube/news-and-events/youtube-features-and-updates-2024/)
49. [AI search and conversational updates — 2025](https://blog.youtube/news-and-events/new-youtube-ai-tools-summer-2025/)
50. [YouTube Premium features — 2024](https://blog.youtube/news-and-events/2024-youtube-premium-features/)
51. [Testing new video context and information — 2024](https://blog.youtube/news-and-events/new-ways-to-offer-viewers-more-context/)
52. [Features and updates — 2023](https://blog.youtube/news-and-events/youtube-new-features-2023/)
53. [Updated look and feel — 2022](https://blog.youtube/news-and-events/an-updated-look-and-feel-for-youtube/)
54. [Desktop and tablet refresh — 2019](https://blog.youtube/news-and-events/introducing-fresh-new-look-for-youtube/)
55. [A new YouTube look — 2017](https://blog.youtube/news-and-events/a-new-youtube-look-that-works-for-you)
56. [A preview of the new look and feel — 2017](https://blog.youtube/news-and-events/a-sneak-peek-at-youtubes-new-look-and/)

## Files

- `components/sns/youtube/2/model/types.ts`
- `components/sns/youtube/2/model/data.ts`
- `components/sns/youtube/2/screen/icons.tsx`
- `components/sns/youtube/2/screen/index.tsx`
- `components/sns/youtube/2/index.ts`
- `app/sns/[category]/[experiment]/page.tsx`
- `components/sns/experiments.ts`

The component family is deliberately separate from `youtube/1` so visual and
interaction regressions can be compared at their original routes.
