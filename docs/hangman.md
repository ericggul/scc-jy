# Hangman experiment

## Interface rationale

1. **Participant situation:** One participant plays a short word game on a shared or personal screen.
2. **Primary parameter:** The set of letters already guessed, expressed through the uncovered word and the drawing.
3. **Perceptual job:** The participant must immediately see which letters are known and how many wrong guesses remain.
4. **Interaction job:** Choosing a letter should reveal every matching position or add exactly one stroke to the drawing.
5. **Wrapper justification:** A divided paper-like play surface preserves Hangman's familiar relationship between word blanks and a progressively drawn figure. The wrapper is the game mechanism, not a theme applied around it.
6. **System family:** Word, drawing, and keyboard use the same restrained ink-and-paper grammar at every viewport size.
7. **Removal test:** The title treatment and round counter are omitted. Removing the word, remaining-guesses sentence, drawing, clue, or keyboard would reduce playability; all other chrome is excluded.

## Variant 1

The first variant is a self-contained English word game at `/hangman/1`. It supports on-screen controls and physical A–Z keyboard input. A round ends after six incorrect guesses or when every unique letter is found.
