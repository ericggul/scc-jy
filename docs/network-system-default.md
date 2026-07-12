# Network System Default

## Interface decision

- **Participant situation:** one participant operates the controller while four observers encounter one screen each.
- **Primary parameter:** the current probability value at each of four nodes.
- **Perceptual job:** notice value leaving one node and reappearing across the other screens after each transition.
- **Interaction job:** reseed the chain at a node or change one directed transition weight and observe the next steps.
- **Wrapper justification:** the controller uses only the graph whose relations are being changed; each screen removes everything except its node value.
- **System family:** one warm neutral surface, black type and rules, tabular numbers, and no node-specific visual themes.
- **Removal test:** edge direction, all 16 weights, four values, node reseeding, and the selected-edge slider are necessary; labels, status indicators, history plots, and ornamental chrome are omitted.

## Model

The default experiment is an intentionally small discrete-time Markov chain. It has four node values and the complete 4 × 4 directed transition matrix: 12 transitions between different nodes plus four self-transitions. On every 100 ms server tick, each row of editable raw weights is normalized. The state moves 8% of the distance toward the next row-vector transition result on each tick, so the distribution visibly morphs rather than jumping while remaining non-negative and summing to one. Clients interpolate between those authoritative snapshots on every animation frame.

The `0.08` transition rate is an intentional experiential compromise, not a provisional mathematical error. Applying 100% of the normalized transition in one tick would make the system jump before a participant could perceive redistribution across four screens. The lazy-chain form `Q = 0.92I + 0.08P` remains a valid Markov transition while making the relational change unfold slowly enough to be experienced.

Pressing a node reseeds the distribution at that node. Every edge exposes `− / weight / +` in the aligned transition console; each press changes only that direction by `0.05`. Small red and blue percentages show the latest increase or decrease for both node values and edge weights. The socket server owns values, weights, and time. Clients derive interpolation, deltas, color, geometry, and all other presentation locally.

The controller follows the established `network-system/macro-economy` grammar. Each of the six physical node pairs carries one compact two-row control at its established graph position, with one independent `− / weight / +` row per direction. There are no external curved self-loop paths: each node's circular boundary represents its self-transition, its upper and lower sectors increase or decrease that weight, and its center reseeds the value. There is no separate matrix console.

Each screen is a white field filled upward from the bottom by a black plane whose height is the node value (`1.0 = 100%`). The existing centered numeric readout remains fixed while the plane morphs behind it; its white difference-composited source renders black over the white field and reverses to white where the black plane meets it. No scale, rule, caption, or additional visualization is added.

Routes:

- `/network-system/controller/default`
- `/network-system/screen/default/1` through `/4`
- `/network-system/screen/default/whole`
