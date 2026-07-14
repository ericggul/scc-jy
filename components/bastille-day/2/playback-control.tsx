import styles from "./playback-control.module.css";

type PlaybackControlProps = {
  isPlaying: boolean;
  onToggle: () => void;
};

export function PlaybackControl({ isPlaying, onToggle }: PlaybackControlProps) {
  return (
    <button
      className={styles.control}
      type="button"
      aria-label={isPlaying ? "Pause" : "Reprendre"}
      aria-pressed={!isPlaying}
      onClick={onToggle}
    >
      {isPlaying ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5v15l12-7.5z" />
        </svg>
      )}
    </button>
  );
}
