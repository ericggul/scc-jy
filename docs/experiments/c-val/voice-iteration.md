# C-VAL voice iteration

The C-VAL voice generator is repository-level tooling shared by future C-VAL
versions. It does not belong to either `components/c-val/1` or
`components/c-val/2`, and generating audio does not change either experiment.

## Files

- `scripts/generate-c-val-exclamations.mjs` runs the generation batches.
- `scripts/collections/c-val-exclamations.json` holds the text, common acting
  direction, emotional presets, model, voice, and default batch size.
- `scripts/collections/c-val-context-minimal-utterances.json` holds the
  validated 78-text, 13-style context-minimal utterance corpus.
- `public/audio/c-val/exclamations/runs/<run>/` receives one preserved run and
  its `manifest.json` prompt ledger.

Each preset may override the spoken punctuation with its own `text` and may
set a small `tempo` adjustment. The audition file at the run root has only
leading/trailing silence trimmed, a subtle tempo correction, and short
click-prevention fades. Untouched API responses are temporary and deleted by
default; pass `--keep-raw` to preserve them under `raw/`, or
`--no-postprocess` to keep the API response itself as the final file.

The repository `.env` file or the shell environment must provide
`OPENAI_API_KEY`. The generator never writes the key into its output.

## Fast iteration

Inspect a batch without spending an API request:

```sh
pnpm audio:c-val -- --dry-run --run first-pass
```

Generate three takes of every configured emotion:

```sh
pnpm audio:c-val -- --run first-pass
```

The default batch uses the `seoul-casual` baseline. Generate the complete
dialect matrix explicitly:

```sh
pnpm audio:c-val -- --run dialect-pass-v01 --dialect all --takes 1
```

Generate the validated context-minimal corpus across every dialect:

```sh
pnpm audio:c-val -- --run context-corpus-v02 \
  --corpus scripts/collections/c-val-context-minimal-utterances.json \
  --dialect all --takes 1
```

Or compare only selected dialects:

```sh
pnpm audio:c-val -- --run south-pass-v01 \
  --dialect busan-gyeongnam,gwangju-jeonnam,jeju --takes 3
```

Concentrate requests on one uncertain variable:

```sh
pnpm audio:c-val -- --run anger-v03 --preset anger --takes 8 \
  --suffix "Make the first word quieter and the last word more explosive."
```

Compare voices without editing the baseline configuration:

```sh
pnpm audio:c-val -- --run cedar-v01 --voice cedar --takes 2
```

Other useful overrides are `--dialect`, `--text`, `--model`, `--format`, `--concurrency`,
`--no-postprocess`, and `--config`. Run `pnpm audio:c-val -- --help` for the
complete list.

## Iteration contract

Use a new `--run` name for every meaningful trial. Existing run directories
are never overwritten. Each manifest records the exact combined prompt, model,
voice, text, file size, and take number, so a selected result can be traced
back to the tested direction. Generation is intentionally nondeterministic;
the ledger preserves the request, not a claim of bit-for-bit reproducibility.

Change one coherent variable per run when possible: acting direction, voice,
word punctuation, or the number of takes. Keep the earlier run as the audible
baseline, listen to the complete batch, and record the perceptual result before
changing another variable.
