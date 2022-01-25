export const isCustom = (event: Event) => !event.target || !(event.target as HTMLElement).matches;
