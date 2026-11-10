import * as mint from 'mint-server';

export function cef(player: mint.Player, code: string): void {
  if (!player.valid) return;
  mint.emitClient(player, 'crp:cef', code);
}
