const API_ENDPOINT = 'https://ai.hackclub.com/chat/completions';

const PROMPTS = {
    EXPLAIN: `You are an expert programmer and a friendly teacher. Your goal is to provide the best possible explanation for the following {language} code snippet. Structure your response in four parts using Markdown: ### High-Level Summary, ### Line-by-Line Breakdown, ### Key Concepts, and ### Conclusion. In the conclusion, provide a brief summary of the code's purpose and what it accomplishes. Be clear, concise, and friendly. Here is the code:\n\`\`\`{language}\n{code}\n\`\`\``,
    DETECT_BUGS: `You are a world-class software engineer specializing in code quality and security. Your task is to conduct a thorough code review of the following {language} code snippet. Analyze it for bugs, performance issues, security vulnerabilities, and style violations. Structure your response in four parts using Markdown: ### Bug Report, ### Potential Issues & Best Practices, ### Style Suggestions, and ### Overall Assessment. For the Bug Report, list any critical errors that would cause crashes or incorrect behavior, including code examples for the fix. For Potential Issues, discuss things that aren't bugs but could be improved for robustness or performance. For Style Suggestions, recommend changes for better readability and consistency. In the Overall Assessment, give a summary of the code's quality. If no issues are found in a category, state "No issues found." Be meticulous and provide clear, actionable feedback. Here is the code:\n\`\`\`{language}\n{code}\n\`\`\``,
    AI_ASSISTANT_SYSTEM_PROMPT: "You are a helpful and knowledgeable AI assistant. You can answer questions about code, programming concepts, and general software development topics. You are concise and provide code examples where appropriate. Your responses should be in Markdown format.",
};

const EXAMPLE_CODES = [
    {
        name: "Python - Simple Web Server",
        language: "python",
        code: `import http.server\nimport socketserver\n\nPORT = 8000\n\nHandler = http.server.SimpleHTTPRequestHandler\n\nwith socketserver.TCPServer(("", PORT), Handler) as httpd:\n    print(f"serving at port {PORT}")\n    httpd.serve_forever()`
    },
    {
        name: "JavaScript - Fetch API Example",
        language: "javascript",
        code: `async function fetchData(url) {\n  try {\n    const response = await fetch(url);\n    if (!response.ok) {\n      throw new Error(\`HTTP error! status: \${response.status}\`);\n    }\n    const data = await response.json();\n    console.log(data);\n    return data;\n  } catch (error) {\n    console.error("Fetch failed:", error);\n  }\n}\n\nfetchData('https://api.github.com/users/octocat');`
    },
    {
        name: "Java - Basic Class and Method",
        language: "java",
        code: `public class Car {\n    String make;\n    String model;\n    int year;\n\n    public Car(String make, String model, int year) {\n        this.make = make;\n        this.model = model;\n        this.year = year;\n    }\n\n    public void displayInfo() {\n        System.out.println("Car: " + year + " " + make + " " + model);\n    }\n\n    public static void main(String[] args) {\n        Car myCar = new Car("Toyota", "Camry", 2020);\n        myCar.displayInfo();\n    }\n}`
    },
    {
        name: "C++ - Hello World",
        language: "cpp",
        code: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`
    },
    {
        name: "HTML - Responsive Image Gallery",
        language: "html",
        code: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Image Gallery</title>\n    <style>\n        .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }\n        .gallery img { width: 100%; height: auto; border-radius: 8px; }\n    </style>\n</head>\n<body>\n    <div class="gallery">\n        <img src="image1.jpg" alt="Image 1">\n        <img src="image2.jpg" alt="Image 2">\n        <img src="image3.jpg" alt="Image 3">\n    </div>\n</body>\n</html>`
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const el = {
        explainBtn: document.getElementById('explain-btn'),
        bugDetectBtn: document.getElementById('bug-detect-btn'),
        explainBtnText: document.getElementById('explain-btn-text'),
        bugBtnText: document.getElementById('bug-btn-text'),
        explainLoader: document.getElementById('explain-loader'),
        bugLoader: document.getElementById('bug-loader'),
        codeInput: document.getElementById('code-input'),
        languageDisplay: document.getElementById('language-display'),
        explanationOutput: document.getElementById('explanation-output'),
        bugReportOutput: document.getElementById('bug-report-output'),
        copyBtn: document.getElementById('copy-btn'),
        copyBtnText: document.getElementById('copy-btn-text'),
        themeToggle: document.getElementById('theme-toggle'),
        sunIcon: document.getElementById('theme-icon-sun'),
        moonIcon: document.getElementById('theme-icon-moon'),
        clearBtn: document.getElementById('clear-btn'),
        shareBtn: document.getElementById('share-btn'),
        shareModal: document.getElementById('share-modal'),
        closeShareModalBtn: document.getElementById('close-modal-btn'),
        copyLinkBtn: document.getElementById('copy-link-btn'),
        copyLinkBtnText: document.getElementById('copy-link-btn-text'),
        shareUrlInput: document.getElementById('share-url-input'),
        shareError: document.getElementById('share-error'),
        tabs: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        hljsTheme: document.getElementById('hljs-theme'),
        examplesBtn: document.getElementById('examples-btn'),
        examplesModal: document.getElementById('examples-modal'),
        closeExamplesModalBtn: document.getElementById('close-examples-modal-btn'),
        examplesList: document.getElementById('examples-list'),
        aiChatOutput: document.getElementById('ai-chat-output'),
        chatMessages: document.getElementById('chat-messages'),
        chatInput: document.getElementById('chat-input'),
        sendChatBtn: document.getElementById('send-chat-btn'),
        chatLoader: document.getElementById('chat-loader'),
        newChatBtn: document.getElementById('new-chat-btn'),
    };

    let lastExplanationMarkdown = '';
    let lastBugReportMarkdown = '';
    let debounceTimer;

    let chatHistory = [{ role: 'system', content: PROMPTS.AI_ASSISTANT_SYSTEM_PROMPT }];

    const debounce = (func, delay) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    };

    const showToast = (message) => {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.classList.add('toast');
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.animation = 'none';
        void toast.offsetWidth;
        toast.style.animation = 'toast-in 0.5s forwards, toast-out 0.5s forwards 2.5s';
    };

    const setInitialTheme = () => {
        const isDark = localStorage.getItem('theme') === 'dark' || 
                       (localStorage.getItem('theme') === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
        updateTheme(isDark);
    };

    const updateTheme = (isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
        el.sunIcon.classList.toggle('hidden', isDark);
        el.moonIcon.classList.toggle('hidden', !isDark);
        el.hljsTheme.href = isDark 
            ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"
            : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
    };

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateTheme(isDark);
    };

    const setLoading = (button, isLoading) => {
        button.disabled = isLoading;
        const loader = button.querySelector('.loader');
        const textEl = button.querySelector('span');
        const originalTextMap = {
            'explain-btn': 'Explain Code',
            'bug-detect-btn': 'Find Bugs',
            'send-chat-btn': '',
        };
        const loadingTextMap = {
            'explain-btn': 'Thinking...',
            'bug-detect-btn': 'Analyzing...',
            'send-chat-btn': '',
        };

        if (loader) loader.classList.toggle('hidden', !isLoading);
        if (textEl) textEl.textContent = isLoading ? loadingTextMap[button.id] : originalTextMap[button.id];
    };

    const switchTab = (tabName) => {
        el.tabs.forEach(t => {
            const isActive = t.dataset.tab === tabName;
            t.classList.toggle('active', isActive);
        });
        el.tabContents.forEach(c => {
            c.classList.toggle('hidden', c.id !== `${tabName}-output`);
            c.classList.toggle('active', c.id === `${tabName}-output`);
        });
    };

    const autoDetectLanguage = () => {
        const code = el.codeInput.value;
        if (code.length < 20) {
            el.languageDisplay.textContent = 'Auto-Detect';
            return;
        }
        const result = hljs.highlightAuto(code);
        el.languageDisplay.textContent = result.language || 'unknown';
    };
    
    const clearAll = () => {
        el.codeInput.value = '';
        el.explanationOutput.innerHTML = el.explanationOutput.querySelector('.placeholder').outerHTML;
        el.bugReportOutput.innerHTML = el.bugReportOutput.querySelector('.placeholder').outerHTML;
        el.languageDisplay.textContent = 'Auto-Detect';
        lastExplanationMarkdown = '';
        lastBugReportMarkdown = '';
        newChat();
        history.replaceState(null, '', window.location.pathname);
    };
    
    const callAI = async (promptTemplate, button, outputElement, isChat = false) => {
        const code = el.codeInput.value.trim();
        let messagesToSend;

        if (isChat) {
            const userMessage = el.chatInput.value.trim();
            if (!userMessage) return;

            el.chatInput.value = '';
            appendMessage('user', userMessage);

            const currentCode = el.codeInput.value.trim();
            const language = el.languageDisplay.textContent;

            const contextContent = currentCode ? `\n\n(Code context: \n\`\`\`${language}\n${currentCode}\n\`\`\`)\n` : '';
            chatHistory.push({ role: 'user', content: userMessage + contextContent });
            messagesToSend = chatHistory;

            el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
        } else {
            if (!code) {
                outputElement.innerHTML = `<div class="placeholder text-yellow-500"><p>Please enter some code first.</p></div>`;
                return;
            }
            const result = hljs.highlightAuto(code);
            const language = result.language || 'code';
            const prompt = promptTemplate.replace(/{language}/g, language).replace(/{code}/g, code);
            messagesToSend = [{ role: 'user', content: prompt }];
        }
        
        setLoading(button, true);
        if (!isChat) {
             outputElement.innerHTML = `<div class="placeholder flex flex-col justify-center items-center h-full text-center text-gray-400 dark:text-gray-500"><div class="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div><p class="mt-4">AI is thinking...</p></div>`;
        }

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: messagesToSend,
                    temperature: isChat ? 0.7 : 0.2,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Received an empty or invalid response from the AI.');
            }

            if (isChat) {
                chatHistory.push({ role: 'assistant', content: content });
                appendMessage('ai', content);
                el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
            } else {
                if (outputElement === el.explanationOutput) {
                    lastExplanationMarkdown = content;
                } else {
                    lastBugReportMarkdown = content;
                }
                outputElement.innerHTML = `<div class="ai-output-content">${marked.parse(content)}</div>`;
                outputElement.querySelectorAll('pre code').forEach(hljs.highlightElement);
            }

        } catch (error) {
            console.error('AI Call Error:', error);
            if (isChat) {
                appendMessage('ai', `Sorry, I encountered an error: ${error.message}. Please try again.`);
                el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
            } else {
                outputElement.innerHTML = `<div class="placeholder text-red-500"><h3>Error communicating with AI.</h3><p class="text-xs mt-2">${error.message}</p></div>`;
            }
        } finally {
            setLoading(button, false);
        }
    };

    const appendMessage = (sender, text) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);
        
        const renderedHtml = marked.parse(text);
        messageDiv.innerHTML = `<div class="ai-output-content">${renderedHtml}</div>`;
        
        el.chatMessages.appendChild(messageDiv);
        messageDiv.querySelectorAll('pre code').forEach(hljs.highlightElement);
        el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
    };

    const newChat = () => {
        chatHistory = [{ role: 'system', content: PROMPTS.AI_ASSISTANT_SYSTEM_PROMPT }];
        el.chatMessages.innerHTML = `
            <div class="placeholder flex flex-col justify-center items-center h-full text-center text-gray-400 dark:text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <p>Ask the AI anything about your code!</p>
                <button id="new-chat-btn-placeholder" class="mt-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors">New Chat</button>
            </div>
        `;
        document.getElementById('new-chat-btn-placeholder').addEventListener('click', newChat);
    };

    const handleCopyClick = () => {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        let contentToCopy = '';

        if (activeTab === 'explanation') {
            contentToCopy = lastExplanationMarkdown;
        } else if (activeTab === 'bug-report') {
            contentToCopy = lastBugReportMarkdown;
        } else if (activeTab === 'ai-chat') {
            const chatMessagesDivs = el.chatMessages.querySelectorAll('.chat-message');
            contentToCopy = Array.from(chatMessagesDivs).map(msgDiv => {
                const sender = msgDiv.classList.contains('user') ? 'User' : 'AI';
                return `${sender}:\n${msgDiv.textContent.trim()}`;
            }).join('\n\n---\n\n');
        }

        if (contentToCopy) {
            navigator.clipboard.writeText(contentToCopy)
                .then(() => {
                    showToast('Copied to clipboard!');
                    el.copyBtnText.textContent = 'Copied!';
                    setTimeout(() => { el.copyBtnText.textContent = 'Copy'; }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showToast('Failed to copy!');
                });
        } else {
            showToast('Nothing to copy!');
        }
    };

    const handleShareClick = () => {
        const code = el.codeInput.value;
        const currentChatHistory = chatHistory.filter(msg => msg.role !== 'system'); 

        if (!code && !lastExplanationMarkdown && !lastBugReportMarkdown && currentChatHistory.length === 0) {
            el.shareUrlInput.value = '';
            el.shareError.textContent = "Nothing to share. Please provide code or generate analysis.";
            el.shareError.classList.remove('hidden');
            el.shareModal.classList.remove('hidden');
            return;
        }
        
        const data = { 
            code, 
            explanation: lastExplanationMarkdown, 
            bugs: lastBugReportMarkdown,
            chat: currentChatHistory 
        };
        
        try {
            const jsonString = JSON.stringify(data);
            const encoded = btoa(encodeURIComponent(jsonString));

            const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
            if (url.length > 4000) { 
                throw new Error("Shared content is too large to fit in a URL.");
            }
            
            el.shareUrlInput.value = url;
            el.shareError.classList.add('hidden');
            el.shareModal.classList.remove('hidden');
        } catch (e) {
            console.error("Error creating share link:", e);
            el.shareUrlInput.value = '';
            el.shareError.textContent = `Could not create share link: ${e.message}`;
            el.shareError.classList.remove('hidden');
            el.shareModal.classList.remove('hidden');
        }
    };
    
    const handleCopyLink = () => {
        if (!el.shareUrlInput.value) return;
        navigator.clipboard.writeText(el.shareUrlInput.value)
            .then(() => {
                el.copyLinkBtnText.textContent = 'Copied!';
                setTimeout(() => { el.copyLinkBtnText.textContent = 'Copy Link'; }, 2000);
                showToast('Link copied!');
            })
            .catch(err => {
                console.error('Failed to copy link: ', err);
                showToast('Failed to copy link!');
            });
    };

    const loadFromShare = () => {
        const params = new URLSearchParams(window.location.search);
        const shareData = params.get('share');
        if (shareData) {
            try {
                const decoded = decodeURIComponent(atob(shareData));
                const data = JSON.parse(decoded);
                
                if (typeof data !== 'object' || data === null) throw new Error("Invalid shared data format.");

                el.codeInput.value = data.code || '';
                
                if (data.explanation) {
                    lastExplanationMarkdown = data.explanation;
                    el.explanationOutput.innerHTML = `<div class="ai-output-content">${marked.parse(data.explanation)}</div>`;
                    el.explanationOutput.querySelectorAll('pre code').forEach(hljs.highlightElement);
                }
                if (data.bugs) {
                    lastBugReportMarkdown = data.bugs;
                    el.bugReportOutput.innerHTML = `<div class="ai-output-content">${marked.parse(data.bugs)}</div>`;
                    el.bugReportOutput.querySelectorAll('pre code').forEach(hljs.highlightElement);
                }
                if (data.chat && Array.isArray(data.chat) && data.chat.length > 0) {
                    chatHistory = [
                        { role: 'system', content: PROMPTS.AI_ASSISTANT_SYSTEM_PROMPT },
                        ...data.chat
                    ];
                    el.chatMessages.innerHTML = '';
                    data.chat.forEach(msg => appendMessage(msg.role, msg.content));
                    switchTab('ai-chat');
                }

                autoDetectLanguage();
            } catch (e) {
                console.error("Failed to load shared data:", e);
                showToast('Failed to load shared content!');
                history.replaceState(null, '', window.location.pathname); 
            }
        }
    };

    const loadExamples = () => {
        el.examplesList.innerHTML = '';
        EXAMPLE_CODES.forEach((example) => {
            const exampleDiv = document.createElement('div');
            exampleDiv.classList.add(
                'bg-gray-100', 'dark:bg-gray-900', 'p-4', 'rounded-lg', 'shadow-sm', 
                'cursor-pointer', 'hover:ring-2', 'hover:ring-blue-500', 'transition-all'
            );
            exampleDiv.innerHTML = `
                <h4 class="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-100">${example.name}</h4>
                <pre class="bg-gray-200 dark:bg-gray-700 rounded-md p-2 text-sm overflow-x-auto"><code class="language-${example.language} text-gray-900 dark:text-gray-100">${example.code.split('\n')[0].substring(0, 50)}...</code></pre>
                <span class="text-xs text-gray-500 dark:text-gray-400 mt-1 block">Language: ${example.language}</span>
            `;
            exampleDiv.addEventListener('click', () => {
                el.codeInput.value = example.code;
                autoDetectLanguage();
                el.examplesModal.classList.add('hidden');
                showToast(`Loaded "${example.name}"`);
            });
            el.examplesList.appendChild(exampleDiv);
            exampleDiv.querySelector('pre code').querySelectorAll('code').forEach(hljs.highlightElement); 
        });
        el.examplesModal.classList.remove('hidden');
    };

    const init = () => {
        el.themeToggle.addEventListener('click', toggleTheme);

        el.tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

        el.explainBtn.addEventListener('click', () => {
            switchTab('explanation');
            callAI(PROMPTS.EXPLAIN, el.explainBtn, el.explanationOutput);
        });
        el.bugDetectBtn.addEventListener('click', () => {
            switchTab('bug-report');
            callAI(PROMPTS.DETECT_BUGS, el.bugDetectBtn, el.bugReportOutput);
        });

        el.sendChatBtn.addEventListener('click', () => callAI(null, el.sendChatBtn, null, true));
        el.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                callAI(null, el.sendChatBtn, null, true);
            }
        });
        document.getElementById('new-chat-btn').addEventListener('click', newChat); 

        el.copyBtn.addEventListener('click', handleCopyClick);
        el.clearBtn.addEventListener('click', clearAll);
        el.shareBtn.addEventListener('click', handleShareClick);
        el.copyLinkBtn.addEventListener('click', handleCopyLink);
        el.closeShareModalBtn.addEventListener('click', () => el.shareModal.classList.add('hidden'));
        
        el.codeInput.addEventListener('input', () => debounce(autoDetectLanguage, 500));

        el.examplesBtn.addEventListener('click', loadExamples);
        el.closeExamplesModalBtn.addEventListener('click', () => el.examplesModal.classList.add('hidden'));
        
        setInitialTheme();
        switchTab('explanation');
        loadFromShare();
    };

    init();
});
