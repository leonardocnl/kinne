import { describe, expect, it, vi } from "vitest";
import { recordUsageEvent, type UsageEventsRepository } from "./usage-events";

const event = {
    browserId: "0b7c5a52-3f0e-4c1e-9d55-8f1a3c2b6e71",
    name: "will_watch_clicked",
    source: null,
    titleId: 42,
};

const repositoryWith = (record: UsageEventsRepository["record"]) => () => ({ record });

describe("recordUsageEvent", () => {
    it("grava o evento válido", async () => {
        const record = vi.fn(async () => {});
        const onError = vi.fn();
        await expect(recordUsageEvent(event, repositoryWith(record), onError)).resolves.toBe(
            "recorded",
        );
        expect(record).toHaveBeenCalledWith(event);
        expect(onError).not.toHaveBeenCalled();
    });

    it("ignora o evento inválido sem tocar no banco", async () => {
        const repository = vi.fn(repositoryWith(async () => {}));
        await expect(
            recordUsageEvent({ ...event, name: "page_view" }, repository, vi.fn()),
        ).resolves.toBe("invalid");
        expect(repository).not.toHaveBeenCalled();
    });

    it("não rejeita quando a gravação falha", async () => {
        const error = new Error("banco fora do ar");
        const onError = vi.fn();
        const failing = repositoryWith(async () => Promise.reject(error));
        await expect(recordUsageEvent(event, failing, onError)).resolves.toBe("failed");
        expect(onError).toHaveBeenCalledWith(error, event);
    });

    it("não rejeita quando nem o repositório pode ser criado", async () => {
        const onError = vi.fn();
        const broken = () => {
            throw new Error("DATABASE_URL_POOLED não definida");
        };
        await expect(recordUsageEvent(event, broken, onError)).resolves.toBe("failed");
        expect(onError).toHaveBeenCalledOnce();
    });
});
