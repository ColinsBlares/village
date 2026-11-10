let open = false;

export function interactionOpen(): boolean {
  return open;
}

export function setInteractionOpen(value: boolean): void {
  open = value;
}
