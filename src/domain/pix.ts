// Pix do Kinne: a chave, o nome e a cidade ficam só aqui. O BR Code estático (EMV) é montado a
// partir deles; o QR de public/pix-qr.svg foi gerado desse payload (scripts/generate-pix-qr.py) e
// um teste confere os dois.

export const PIX = {
    // chave aleatória (EVP)
    key: "54af0fee-785d-4a6b-9448-1f736e1cf713",
    name: "LEONARDO CARVALHO SILVA",
    city: "LAVRAS",
} as const;

/** CRC16-CCITT-FALSE (polinômio 0x1021, início 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16(text: string): string {
    let crc = 0xffff;
    for (const byte of new TextEncoder().encode(text)) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

// campo EMV: id (2 dígitos), tamanho em bytes (2 dígitos) e valor
const field = (id: string, value: string) => {
    const length = new TextEncoder().encode(value).length;
    return `${id}${String(length).padStart(2, "0")}${value}`;
};

/** BR Code Pix estático, sem valor, que o app do banco lê no QR ("copia e cola"). */
export function pixPayload({ key, name, city } = PIX): string {
    const body =
        field("00", "01") +
        field("01", "11") +
        field("26", field("00", "br.gov.bcb.pix") + field("01", key)) +
        field("52", "0000") +
        field("53", "986") +
        field("58", "BR") +
        field("59", name) +
        field("60", city) +
        field("62", field("05", "***")) +
        "6304";
    return body + crc16(body);
}
