const { streamText } = require("ai");
const { openai } = require("@ai-sdk/openai");

async function main() {
    try {
        const result = await streamText({
            model: openai("gpt-4o-mini"),
            messages: [{ role: "user", content: "hi" }]
        });
        console.log("Keys:", Object.keys(result));
        console.log("Proto:", Object.getOwnPropertyNames(Object.getPrototypeOf(result)));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
main();
