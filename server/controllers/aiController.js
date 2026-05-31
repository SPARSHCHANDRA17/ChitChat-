const { GoogleGenerativeAI } = require("@google/generative-ai");

const suggestReply = async (req, res) => {
    try {
        const { lastMessage } = req.body;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).send({ success: false, message: "Configuration error" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Use a current, stable model name
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `The user received this message: "${lastMessage}". 
        Suggest a short, polite, and natural reply in the same language. 
        Return ONLY the reply text, no quotes, no extra text.`;

        const result = await model.generateContent(prompt);
        const suggestion = await result.response.text();

        res.status(200).send({ success: true, data: suggestion.trim() });
    } catch (error) {
        console.error("GEMINI API ERROR:", error); 
        res.status(500).send({ success: false, message: error.message });
    }
};

module.exports = { suggestReply };