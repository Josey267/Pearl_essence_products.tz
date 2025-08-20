// This script contains the logic for the agents&Community.html page.

document.addEventListener('DOMContentLoaded', () => {

    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const agentListContainer = document.getElementById('agent-list');

    // =============================================================
    // Dark/Light Mode Toggle
    // =============================================================
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    // =============================================================
    // Dynamic Agent Data & Rendering
    // =============================================================
    // Example data for agents. This could be fetched from a database.
    const agents = [
        { name: "Jessica A.", role: "Skincare Specialist", rating: 4.9, status: "Available" },
        { name: "Mark T.", role: "Product Expert", rating: 4.7, status: "Busy" },
        { name: "Sarah K.", role: "Community Manager", rating: 5.0, status: "Available" },
        { name: "David M.", role: "Formulation Scientist", rating: 4.8, status: "Busy" }
    ];

    function renderAgents() {
        agentListContainer.innerHTML = ''; // Clear existing cards
        agents.forEach(agent => {
            const statusClass = agent.status.toLowerCase();
            const agentCard = document.createElement('div');
            agentCard.classList.add('agent-card');
            agentCard.innerHTML = `
                <div class="agent-avatar">${agent.name.charAt(0)}</div>
                <div class="agent-details">
                    <p class="agent-name">${agent.name}</p>
                    <p class="agent-info">${agent.role}</p>
                    <p class="agent-rating">
                        <i class="fas fa-star"></i> ${agent.rating}
                    </p>
                </div>
                <span class="agent-availability ${statusClass}">${agent.status}</span>
            `;
            agentListContainer.appendChild(agentCard);
        });
    }

    renderAgents();

    // =============================================================
    // AI Chatbot Functionality
    // =============================================================

    // Product data will be used by the AI to answer questions
    const productData = [
        { name: "Sunscreen SPF 50+", price: "$29.99", features: ["Broad Spectrum UV Protection", "Non-Greasy Formula", "Water Resistant"] },
        { name: "Hydrating Cream", price: "$45.99", features: ["24-Hour Hydration", "Hyaluronic Acid Infusion", "Weightless Feel"] },
        { name: "Vitamin C Serum", price: "$39.99", features: ["Brightens Complexion", "Reduces Dark Spots", "Antioxidant Rich Formula"] },
        { name: "Anti-Aging Serum", price: "$59.99", features: ["Reduces Fine Lines & Wrinkles", "Retinol & Peptide Complex", "Boosts Collagen Production"] },
        { name: "Night Treatment", price: "$34.99", features: ["Overnight Repair Complex", "Pearl Collagen Boost", "Advanced Moisture Lock"] },
        { name: "Gentle Cleanser", price: "$22.99", features: ["Micro-Pearl Exfoliation", "pH Balanced Formula", "Silicon-Free Formula"] }
    ];

    function appendMessage(sender, text) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container', `${sender}-message`);
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');
        messageBubble.textContent = text;
        messageContainer.appendChild(messageBubble);
        chatBox.appendChild(messageContainer);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message-container', 'assistant-message', 'typing-indicator');
        typingIndicator.innerHTML = '<div class="message-bubble">...</div>';
        chatBox.appendChild(typingIndicator);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = chatBox.querySelector('.typing-indicator');
        if (typingIndicator) {
            chatBox.removeChild(typingIndicator);
        }
    }

    async function getGeminiResponse(prompt) {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };
        const apiKey = ""; // Platform automatically provides this
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let retries = 0;
        const maxRetries = 3;
        const baseDelay = 1000;

        while (retries < maxRetries) {
            try {
                // Test connectivity with a simple echo service
                const echoResponse = await fetch('https://postman-echo.com/get?message=test');
                if (!echoResponse.ok) {
                    console.error('Connectivity test failed. Postman Echo status:', echoResponse.status);
                    return "Sorry, there's a connectivity issue. The assistant is unable to reach its service.";
                }

                // Attempt to call the Gemini API
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.candidates && result.candidates.length > 0 &&
                        result.candidates[0].content && result.candidates[0].content.parts &&
                        result.candidates[0].content.parts.length > 0) {
                        return result.candidates[0].content.parts[0].text;
                    } else {
                        console.error('API response format unexpected:', result);
                        return "Sorry, I couldn't get a response. The API format was unexpected. Please try again.";
                    }
                } else if (response.status === 429) {
                    console.warn(`Rate limit hit. Retrying in ${baseDelay * Math.pow(2, retries)}ms...`);
                    const delay = baseDelay * Math.pow(2, retries);
                    retries++;
                    await new Promise(res => setTimeout(res, delay));
                } else {
                    const errorText = await response.text();
                    console.error('API Error:', response.status, errorText);
                    return "Sorry, there was an error communicating with the assistant.";
                }
            } catch (error) {
                console.error('Fetch Error:', error);
                // Log the error for more specific details
                console.error('Detailed Fetch Error:', error.message, error.stack);
                return "Sorry, there was a network error.";
            }
        }
        return "I'm experiencing high traffic right now. Please try again in a moment.";
    }

    async function handleChat() {
        const userMessage = chatInput.value.trim();
        if (userMessage === '') return;

        appendMessage('user', userMessage);
        chatInput.value = '';

        showTypingIndicator();

        let botResponse = "I'm sorry, I don't have information about that. Please try asking about our products.";

        // Look for product-related keywords
        const userQueryLower = userMessage.toLowerCase();

        for (const product of productData) {
            if (userQueryLower.includes(product.name.toLowerCase())) {
                let responseText = `Here is some information about our ${product.name}:\n`;
                responseText += `Price: ${product.price}\n`;
                responseText += `Features: ${product.features.join(', ')}.`;
                botResponse = responseText;
                break;
            }
        }

        // If no product keyword is found, use the Gemini API
        if (botResponse.startsWith("I'm sorry")) {
            botResponse = await getGeminiResponse(userMessage);
        }

        removeTypingIndicator();
        appendMessage('assistant', botResponse);
    }

    sendBtn.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleChat();
        }
    });
});
