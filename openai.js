const OpenAI = require('OpenAI');
const {OpenAIAPI} = require("./config.json");

const openai = new OpenAI({ apiKey: OpenAIAPI });


async function checkProfanityAI(text) {
    try {
        const completion = await openai.chat.completions.create({
            messages: [{
                role: "user", content: `Oce� w skali 0-5 wulgarno��, obra�liwo�� wypowiedzi (zwr�� tylko liczb�): "${text}"` }],
            model: "gpt-4o-mini",
        });
        const response = completion.choices[0].message.content;
        const rating = parseInt(response);
        if (isNaN(rating)) {
            console.log("AI could not rate the offensiveness of the text.");
        } else {
            console.log(rating);
        }
    } catch (err) {
        console.error(err);
    }
}

module.exports = checkProfanityAI;