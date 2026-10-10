// Estado da rotação de capas da tela inicial (US001 C2 a C5).
export type Rotation = {
    // capa, contador e miniatura marcada
    current: number;
    // indicação cujo texto aparece; fica para trás enquanto o título antigo sai
    shown: number;
    // troca do título: "out" sobe o antigo, "in" sobe o novo
    swap: "idle" | "out" | "in";
    playing: boolean;
};

export type RotationEvent =
    | { type: "show"; index: number; animate: boolean }
    | { type: "titleAnimationEnd" }
    | { type: "togglePause" }
    | { type: "stop" };

export const initialRotation: Rotation = { current: 0, shown: 0, swap: "idle", playing: true };

export function rotate(state: Rotation, event: RotationEvent): Rotation {
    switch (event.type) {
        case "show":
            if (event.index === state.current) return state;
            return event.animate
                ? { ...state, current: event.index, swap: "out" }
                : { ...state, current: event.index, shown: event.index, swap: "idle" };
        case "titleAnimationEnd":
            if (state.swap === "out") return { ...state, shown: state.current, swap: "in" };
            return { ...state, swap: "idle" };
        case "togglePause":
            return { ...state, playing: !state.playing };
        case "stop":
            return { ...state, playing: false };
    }
}
