// SCC integration correction, 2026-09-08. The upstream engine and assets remain
// in dino.html. Complete its 400ms intro even when CSS emits no legacy event.
export function installRunnerCompatibility(Runner, clock) {
  const originalIntro = Runner.prototype.playIntro;
  const originalStart = Runner.prototype.startGame;
  Runner.events.ANIM_END = "animationend";

  Runner.prototype.startGame = function () {
    if (!this.playingIntro) return;
    clock.clearTimeout(this.introCompletionTimer);
    originalStart.call(this);
  };

  Runner.prototype.playIntro = function () {
    const wasStarted = this.started;
    originalIntro.call(this);
    if (!wasStarted && this.playingIntro) {
      this.introCompletionTimer = clock.setTimeout(() => this.startGame(), 400);
    }
  };
}
