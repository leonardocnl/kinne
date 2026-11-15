const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isBrowserId = (value: unknown): value is string =>
    typeof value === "string" && UUID.test(value);
