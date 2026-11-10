type PriceHook = (bizId: number, key: string, value: number) => void;

const hooks: PriceHook[] = [];

export function onBizPrice(hook: PriceHook): void {
  hooks.push(hook);
}

export function applyBizPrice(bizId: number, key: string, value: number): void {
  for (const hook of hooks) hook(bizId, key, value);
}
