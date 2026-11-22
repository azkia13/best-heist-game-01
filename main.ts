// Vaultbreak: The Meridian Job — the program that hands the game in.
// It copies this directory's game/ and screenshots/ to the output
// directory (MAKEFUN_OUTPUT_DIR outside the grader, /output inside it)
// and writes /output/dossier.json with the vendored make.fun library.
// Node 22 standard library only; running it twice writes the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps: only text_max_bytes shapes the dossier's bytes;
// the rest refuse an entry the scorer would refuse (more than 4 shots or
// one over 256 KiB; game/ past 993 entries or 48 MiB, or a path over
// 1000 bytes — game/ shares /output's own 1000-entry cap with the shots
// and dossier.json, so 993 leaves exactly room).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
