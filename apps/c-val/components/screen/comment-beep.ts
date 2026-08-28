/**
 * Final shared loudness trim for every browser-rendered C-VAL comment censor
 * beep. Keep the source corpus and its timestamp data unchanged; adjust this
 * one value during final sound balancing.
 */
export const C_VAL_COMMENT_BEEP_GAIN_SCALE = 0.7;

/** A softer censor edge without changing the source-audio timestamps. */
export const C_VAL_COMMENT_BEEP_FADE_SECONDS = 0.012;

/**
 * A nearly imperceptible downward glide across the censored interval. Keep it
 * close to one so the beep remains a broadcast censor rather than an effect.
 */
export const C_VAL_COMMENT_BEEP_FINAL_FREQUENCY_RATIO = 0.975;
