// Streamings por assinatura suportados no Brasil.
export const STREAMINGS = ["netflix", "max", "prime-video", "disney-plus", "globoplay"] as const;

export type Streaming = (typeof STREAMINGS)[number];

export function isStreaming(value: string): value is Streaming {
    return (STREAMINGS as readonly string[]).includes(value);
}
