import { createServer } from "node:http";

/** Only Groq is mocked. Auth, RLS, transactions and private storage are real Supabase. */
export default async function setup() {
  const server = createServer(async (request, response) => {
    if (request.url !== "/openai/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }
    let size = 0;
    for await (const chunk of request) size += chunk.length;
    if (size > 6 * 1024 * 1024) {
      response.writeHead(413).end();
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                readable: true,
                amount: "101000",
                merchant: "Bữa trưa OCR",
                date: "2026-10-05",
              }),
            },
          },
        ],
      }),
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(3101, "127.0.0.1", resolve);
  });
  return () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
}
