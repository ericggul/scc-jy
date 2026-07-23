# Bloomberg Terminal UI research

Research date: 2026-07-10

## Method

Three independent four-query search batches were collected across interface screenshots, equities, Launchpad, command/navigation guides, ECO, OMON, PORT, WEI, product documentation, UX history, and university training material. After URL deduplication, the corpus contains **113 distinct results**. Earlier exploratory searches and image/PDF page inspection were used to choose the deep-review set below but are not needed to reach the count.

## Deep review

| Source | UI finding carried into stock/2 |
| --- | --- |
| [Bloomberg Getting Started Guide](https://data.bloomberglp.com/professional/sites/10/Getting-Started-Guide-for-Students-English.pdf) | Four independent panels; toolbar, command line, and function area; autocomplete makes commands discoverable. |
| [Bloomberg Launchpad](https://www.bloomberg.com.br/produto/launchpad/) | Custom workspaces combine monitors, alerts, charts, news, P&L, collaboration, and execution. |
| [Bloomberg Charts](https://professional.bloomberg.com/products/bloomberg-terminal/charts/) | Comparison, templates, customization, backtesting, maps, and co-editing are core chart behaviors. |
| [Bloomberg Portfolio & Risk Analytics](https://professional.bloomberg.com/products/bloomberg-terminal/portfolio-analytics/) | Positions, risk, performance, scenarios, and attribution stay connected in one workflow. |
| [Bloomberg Professional App](https://professional.bloomberg.com/products/bloomberg-terminal/access/bloomberg-professional-app/) | News, data, alerts, research, and IB remain the minimum portable workflow. |
| [Bloomberg Collaboration Tools](https://www.bloomberg.com/professional/products/bloomberg-terminal/collaboration-tools/) | Screens, security data, news, notes, and conversations are shareable workflow objects. |
| [Bloomberg Television UX case study](https://www.bloomberg.com/ux/2017/09/05/inside-ux-creating-engaging-way-experience-bloomberg-television/) | Speed and context outrank visual calm; information streams are placed side by side and linked to action. |
| [Bloomberg Terminal Primer](https://data.bloomberglp.com/professional/sites/10/LUISS_2018Primer.pdf) | ECO, DES, and GP screenshots establish dense headers, numbered actions, tight tables, and chart conventions. |
| [Bloomberg Terminal Help](https://www.bu.edu/metit/services/ed-tech/labs/bloomberg/help/) | Green action keys, yellow market-sector keys, Panel, Menu, and Help encode the navigation model. |
| [CME Bloomberg OMON guide](https://www.cmegroup.com/education/brochures-and-handbooks/cme-equity-index-options-on-futures-bloomberg-cheat-sheet) | OMON shows how command syntax leads into filter-heavy, table-forward derivatives workflows. |
| [The Impossible Bloomberg Makeover](https://uxmag.com/articles/the-impossible-bloomberg-makeover) | A useful critique: expertise, muscle memory, information richness, and speed make cosmetic simplification risky. |
| [IDEO Bloomberg Terminal concept](https://www.idsa.org/awards-recognition/idea/idea-gallery/bloomberg-terminal-concept/) | The redesign principle worth retaining is micro-to-macro organization across linked screens. |

## Design synthesis

- Preserve command grammar: security + market sector + mnemonic + GO.
- Make the command line persistent and let autocomplete/discovery coexist with expert shortcuts.
- Use a linked multi-pane workspace, not independent dashboard cards.
- Keep market context visible while a security is being studied.
- Treat color semantically: amber for active commands, cyan for linked instruments, green/red only for direction.
- Prefer borders, aligned columns, compressed type, and tabular numerals over radius, elevation, and decorative chrome.
- Keep news and collaboration adjacent to analysis because Terminal workflows turn information into action without context switching.
- Simplify by reducing simultaneous functions, not by removing density or keyboard logic.

## Distinct search-result ledger (113)

1. https://www.bloomberg.com.br/produto/launchpad/
2. https://www.bloomberg.com/latam/producto/launchpad/
3. https://www.bloomberg.com/professional/support/documentation/
4. https://www.bloomberg.com/professional/insights/technology/bloomberg-terminal-essentials-ib-worksheets-launchpad/
5. https://data.bloomberglp.com/professional/sites/10/LUISS_2018Primer.pdf
6. https://bryt.library.yorku.ca/wp-content/uploads/2018/08/How-to-take-a-screenshot-on-the-Bloomberg-terminal.pdf
7. https://docslib.org/doc/39186/view-the-bloomberg-terminal-user-guide
8. https://www.bloomberg.com/company/press/bloomberg-next/
9. https://datacenter.safe-frankfurt.de/documents/Bloomberg_help_page.pdf
10. https://www.bloomberg.com.br/suporte/faq/
11. https://www.scribd.com/document/53278419/5052
12. https://professional.content.cirrus.bloomberg.com/professional2023/insights/technology/bloomberg-terminal-essentials-getting-started/
13. https://en.wikipedia.org/wiki/Bloomberg_Terminal
14. https://www.bloomberg.com/company/press/bloomberg-launches-enterprise-app-portal-to-financial-markets/
15. https://ro.scribd.com/document/715448320/How-to-take-a-screenshot-on-the-Bloomberg-terminal
16. https://www.adelphi.edu/wp-content/uploads/2013/12/James-Riley-Jr.-Trading-Room-Bloomberg-Terminal-User-Guide.pdf
17. https://www.scribd.com/document/970483280/Bloomberg-User-Guide
18. https://blogs.kent.ac.uk/kbs-news-events/files/2017/10/Bloomberg-Terminal-Guide.pdf
19. https://www.reddit.com/r/bloomberg/comments/uo28m1
20. https://es.wikipedia.org/wiki/Terminal_Bloomberg
21. https://www.reddit.com/r/bloomberg/comments/kwdyc5
22. https://www.reddit.com/r/bloomberg/comments/1mx0p92/terminal_basics/
23. https://www.reddit.com/r/bloomberg/comments/1gu3b5z
24. https://www.reddit.com/r/bloomberg/comments/1l2ho9l
25. https://www.reddit.com/r/CLI/comments/1ss88re/a_bloombergstyle_btc_terminal_in_my_cli/
26. https://www.reddit.com/r/bloomberg/comments/tqbusx
27. https://www.reddit.com/r/bloomberg/comments/1543458
28. https://www.reddit.com/r/bloomberg/comments/j2s1yr
29. https://www.reddit.com/r/FinancialCareers/comments/dl4t24
30. https://www.reddit.com/r/bloomberg/comments/tw7bwj
31. https://www.reddit.com/r/bloomberg/comments/1e3pd89
32. https://en.wikipedia.org/wiki/Function_key
33. https://de.wikipedia.org/wiki/Bloomberg_Terminal
34. https://pt.wikipedia.org/wiki/Terminal_Bloomberg
35. https://en.wikipedia.org/wiki/Status_key
36. https://arxiv.org/abs/2006.01117
37. https://arxiv.org/abs/2401.07483
38. https://arxiv.org/abs/1310.3165
39. https://arxiv.org/abs/2303.17564
40. https://professional.bloomberg.com/products/bloomberg-terminal/portfolio-analytics/
41. https://www.bloomberg.com/professional/solution/tradebook/
42. https://about.bloomberg.co.jp/product/portfolio-risk-management/
43. https://www.bloomberg.com.br/produto/analise-de-carteira-e-risco/
44. https://data.bloomberglp.com/professional/sites/10/Getting-Started-Guide-for-Students-English.pdf
45. https://www.bloomberg.com/company/press/bloomberg-launches-screened-choice-equity-indices-for-custom-investment-strategies/
46. https://www.bloomberg.com.br/solucao/bloomberg-tradebook/
47. https://professional.content.cirrus.bloomberg.com/professional2023/insights/technology/bloomberg-terminal-essentials-best-equities-functions/
48. https://www.bloomberg.com/latam/solucion/bloomberg-tradebook/
49. https://www.bloomberg.com/professional/products/bloomberg-terminal/research/economics/
50. https://www.bloomberg.com.br/blog/como-tirar-maximo-proveito-de-uma-ferramenta-de-gestao-de-carteiras/
51. https://bloomberg-manual.readthedocs.io/en/latest/Equity/
52. https://ebrary.net/50706/economics/economic_calendar
53. https://data.bloomberglp.com/bat/sites/3/AdamLei-WP.pdf
54. https://data.bloomberglp.com/professional/sites/4/609303600_HF_Port_BCH_DIG.pdf
55. https://bloomberg-manual.readthedocs.io/_/downloads/en/latest/pdf/
56. https://data.bloomberglp.com/bat/sites/3/2016/09/LUISS-Bloomberg-Primer.pdf
57. https://www.reddit.com/r/options/comments/tt4kwl/free_access_to_bloomberg_terminal/
58. https://www.reddit.com/r/bloomberg/comments/13c1ott
59. https://www.reddit.com/r/CLI/comments/1tde7b7/gloomberb_07_opensource_bloomberg_terminal/
60. https://www.reddit.com/r/bloomberg/comments/1gior45
61. https://www.reddit.com/r/bloomberg/comments/ltc4df
62. https://www.reddit.com/r/bloomberg/comments/txrlxa
63. https://www.reddit.com/r/bloomberg/comments/k54vw1
64. https://www.reddit.com/r/bloomberg/comments/yyetkg
65. https://www.reddit.com/r/FinancialCareers/comments/1t487y9/bloommberg_setup_layout_stoxx_600/
66. https://www.reddit.com/r/bloomberg/comments/z9huqt
67. https://www.reddit.com/r/bloomberg/comments/1fuykvb
68. https://arxiv.org/abs/2607.03082
69. https://en.wikipedia.org/wiki/Bloomberg_Radio
70. https://en.wikipedia.org/wiki/Bloomberg_Markets
71. https://arxiv.org/abs/2504.03311
72. https://arxiv.org/abs/1910.05536
73. https://arxiv.org/abs/2401.05447
74. https://en.wikipedia.org/wiki/S%26P_Global_Broad_Market_Index
75. https://en.wikipedia.org/wiki/FTSE_Global_Equity_Index_Series
76. https://en.wikipedia.org/wiki/S%26P_Global_1200
77. https://www.spglobal.com/spdji/en/indices/equity/sp-global-1200/
78. https://www.bloomberg.com/professional/products/bloomberg-terminal/collaboration-tools/
79. https://www.idsa.org/awards-recognition/idea/idea-gallery/bloomberg-terminal-concept/
80. https://www.bloomberg.com/ux/2017/09/05/inside-ux-creating-engaging-way-experience-bloomberg-television/
81. https://www.bloomberg.com/company/stories/ux-at-bloomberg-a-conversation-with-fahd-arshad/
82. https://www.bloomberg.com/company/stories/what-took-build-altd-bloomberg-terminal-alternative-data-function/
83. https://www.bloomberg.com/company/stories/bloombergs-customer-centric-design-ethos/
84. https://www.bloomberg.com/ux/2020/08/11/consistency-more-than-just-a-buzzword/
85. https://www.bloomberg.com.br/solucao/terminal-bloomberg/collaboration-tools/
86. https://fbe.unimelb.edu.au/research/facilities-and-resources/research-databases/bloomberg-terminal
87. https://about.bloomberg.co.jp/solution/bloomberg-terminal/
88. https://library.fuqua.duke.edu/docs/Bloomberg-Getting-Started-Guide-for-Students-English.pdf
89. https://blogs.kent.ac.uk/kent-business-matters/files/2017/10/Bloomberg-Terminal-Guide.pdf
90. https://uxmag.com/articles/the-impossible-bloomberg-makeover
91. https://www.bbk.ac.uk/documents/guide-to-using-bloomberg-getting-started-for-students.pdf
92. https://data.bloomberglp.com/professional/sites/10/Education-Brochure.pdf
93. https://alexacomputing.com/files/guides/fstp_guide/FSTP/pdf/FSTP_20_Bloomberg_Functions_v1.pdf
94. https://service.bloomberg.com/Page
95. https://www.reddit.com/r/FinancialCareers/comments/1szciqp/bloomberg_terminal_functions/
96. https://www.reddit.com/r/bloomberg/comments/1p1opfo/how_could_university_student_or_a_university_get/
97. https://www.reddit.com/r/bloomberg/comments/ffcp3t
98. https://www.reddit.com/r/bloomberg/comments/1ulqn19/question_about_terminal_access/
99. https://arxiv.org/abs/2311.10516
100. https://www.reddit.com/r/bloomberg/comments/112os92
101. https://www.reddit.com/r/bloomberg/comments/1brxkrh
102. https://www.reddit.com/r/bloomberg/comments/14ulno3
103. https://zh.wikipedia.org/wiki/%E5%BD%AD%E5%8D%9A%E7%B5%82%E7%AB%AF%E6%A9%9F
104. https://www.reddit.com/r/SideProject/comments/1s7ixfu/i_spent_2_weeks_building_a_free_bloomberg/
105. https://www.reddit.com/r/bloomberg/comments/gacws0
106. https://www.reddit.com/r/bloomberg/comments/1eqrhas
107. https://arxiv.org/abs/2508.10927
108. https://www.reddit.com/r/bloomberg/comments/1of0f6j
109. https://en.wikipedia.org/wiki/Bloomberg_L.P
110. https://en.wikipedia.org/wiki/Bloomberg_News
111. https://arxiv.org/abs/2606.13843
112. https://en.wikipedia.org/wiki/Bloomberg_Aptitude_Test
113. https://www.kiplinger.com/investing/stocks/why-financial-advisers-will-benefit-as-google-shakes-up-financial-research

