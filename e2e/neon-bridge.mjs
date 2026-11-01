// Test-only preload for `next start` in the visual suite. The app's driver speaks Neon's HTTP
// protocol, which a plain Postgres does not; this answers those requests from the disposable
// Postgres on 127.0.0.1:5432, with no change to app code. Only intercepts the fake test host.
import net from "node:net";

const HOST = "https://api.visual.test/";

const cstr = (text) => Buffer.from(`${text}\0`);

function message(type, ...parts) {
    const body = Buffer.concat(parts);
    const length = Buffer.alloc(4);
    length.writeInt32BE(body.length + 4);
    return Buffer.concat([Buffer.from(type), length, body]);
}

function int16(value) {
    const out = Buffer.alloc(2);
    out.writeInt16BE(value);
    return out;
}

function int32(value) {
    const out = Buffer.alloc(4);
    out.writeInt32BE(value);
    return out;
}

function extendedQuery(query, params) {
    const values = params.map((value) => {
        if (value === null || value === undefined) return int32(-1);
        const text = Buffer.from(String(value));
        return Buffer.concat([int32(text.length), text]);
    });
    return Buffer.concat([
        message("P", cstr(""), cstr(query), int16(0)),
        message("B", cstr(""), cstr(""), int16(0), int16(values.length), ...values, int16(0)),
        message("D", Buffer.from("P"), cstr("")),
        message("E", cstr(""), int32(0)),
        message("S"),
    ]);
}

function parseFields(body) {
    const fields = [];
    let at = 2;
    for (let i = 0; i < body.readInt16BE(0); i++) {
        const end = body.indexOf(0, at);
        fields.push({
            name: body.toString("utf8", at, end),
            dataTypeID: body.readInt32BE(end + 7),
        });
        at = end + 19;
    }
    return fields;
}

function parseRow(body) {
    const row = [];
    let at = 2;
    for (let i = 0; i < body.readInt16BE(0); i++) {
        const size = body.readInt32BE(at);
        at += 4;
        row.push(size < 0 ? null : body.toString("utf8", at, at + size));
        at += Math.max(size, 0);
    }
    return row;
}

function parseError(body) {
    const error = new Error("query failed");
    for (const part of body.toString("utf8").split("\0")) {
        if (part[0] === "M") error.message = part.slice(1);
        if (part[0] === "C") error.code = part.slice(1);
    }
    return error;
}

/** Runs the statements on one connection, in order, and resolves with one result for each. */
function run(statements) {
    return new Promise((resolve, reject) => {
        const socket = net.connect(5432, "127.0.0.1");
        const results = [];
        let pending = [...statements];
        let current = { fields: [], rows: [], command: "", rowCount: 0 };
        let buffer = Buffer.alloc(0);
        let failure = null;
        const startup = Buffer.concat([int32(196608), cstr("user"), cstr("postgres"), cstr("")]);
        socket.write(Buffer.concat([int32(startup.length + 4), startup]));
        socket.on("error", reject);
        socket.on("data", (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            while (buffer.length >= 5 && buffer.length >= buffer.readInt32BE(1) + 1) {
                const type = String.fromCharCode(buffer[0]);
                const body = buffer.subarray(5, buffer.readInt32BE(1) + 1);
                buffer = buffer.subarray(buffer.readInt32BE(1) + 1);
                if (type === "T") current.fields = parseFields(body);
                if (type === "D") current.rows.push(parseRow(body));
                if (type === "E") failure = parseError(body);
                if (type === "C") {
                    const tag = body.toString("utf8", 0, body.length - 1).split(" ");
                    current.command = tag[0];
                    current.rowCount = Number(tag.at(-1)) || 0;
                }
                if (type !== "Z") continue;
                if (failure) {
                    socket.end();
                    return reject(failure);
                }
                if (statements.length !== pending.length) results.push(current);
                current = { fields: [], rows: [], command: "", rowCount: 0 };
                const next = pending.shift();
                if (!next) {
                    socket.end();
                    return resolve(results);
                }
                socket.write(extendedQuery(next.query, next.params ?? []));
            }
        });
    });
}

function shape(result, asArray) {
    const rows = asArray
        ? result.rows
        : result.rows.map((row) =>
              Object.fromEntries(result.fields.map((field, i) => [field.name, row[i]])),
          );
    return { ...result, rows, rowAsArray: asArray };
}

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input.url ?? String(input));
    if (!url.startsWith(HOST)) return realFetch(input, init);
    const headers = new Headers(init.headers);
    const asArray = headers.get("Neon-Array-Mode") === "true";
    const request = JSON.parse(init.body);
    const json = (status, body) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json" },
        });
    try {
        if (!request.queries) return json(200, shape((await run([request]))[0], asArray));
        const begin = { query: "begin" };
        const commit = { query: "commit" };
        const results = await run([begin, ...request.queries, commit]);
        return json(200, { results: results.slice(1, -1).map((r) => shape(r, asArray)) });
    } catch (error) {
        return json(400, { message: error.message, code: error.code });
    }
};
