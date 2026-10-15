# REL-Fi audio assets

Drop the real MP3 files for the REL-Fi game in this folder. The game code
(`src/relfi/game/audio/sound.ts`) looks for exactly these filenames:

| File | Purpose | Played when |
|---|---|---|
| `background.mp3` | Background / gameplay music | Once a game starts (looped); stops when returning to the home screen or leaving REL-Fi |
| `button-click.mp3` | Button interaction sound | Primary actions on the game's start screen (Host a game, Play Solo, Join with code) |
| `win.mp3` | Victory sound | The game confirms the signed-in player finished in 1st place |
| `lose.mp3` | Loss sound | The game confirms the signed-in player did not win |

## Rules the code already handles

- **Missing files are fine.** Until the real MP3s are added, playback failures
  are silently ignored (button clicks fall back to the built-in synth tone).
  Gameplay and production builds never depend on these files existing.
- **Autoplay policy.** Browsers block audio until a user gesture; background
  music starts from in-game interactions (or the sound toggle) and simply does
  nothing if blocked or missing.
- **No duplicates.** A single background `<audio>` element is reused; it is
  paused and reset when the player returns to the landing screen or unmounts.
- **Sound toggle.** Everything respects the in-game sound on/off switch
  (top-left control).

## When the real files arrive

1. Confirm the actual filenames. If they differ from the table above, either
   rename the files or update the `clipFiles` map in
   `src/relfi/game/audio/sound.ts`.
2. Keep files reasonably compressed (mono 128 kbps or less is plenty for
   SFX; background music stereo 128–192 kbps).
3. Manually verify: background starts once per game, win/lose fire on the
   final results screen, clicks respond, and a missing/renamed file never
   breaks the game.
