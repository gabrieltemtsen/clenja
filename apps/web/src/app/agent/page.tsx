"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useChat } from "ai/react";

export default function AgentPage() {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: "/api/chat",
    });

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const suggestedPrompts = [
        "What's the current pool status?",
        "How much can I borrow?",
        "Quote me a $200 loan for 30 days",
        "Do I have any active loans?",
    ];

    return (
        <main className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="px-4 py-4 border-b border-gray-800">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href="/" className="text-gray-400 hover:text-white text-sm">
                        ← Back
                    </Link>
                    <h1 className="text-lg font-semibold">Clenja Agent</h1>
                    <div className="w-16" /> {/* Spacer for centering */}
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-2xl mx-auto space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-yellow-400 flex items-center justify-center">
                                <span className="text-2xl">🤖</span>
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Hello! I'm Clenja</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                I can help you check pool stats, get loan quotes, track your loans, and answer questions about cooperative lending.
                            </p>

                            {/* Suggested Prompts */}
                            <div className="flex flex-wrap justify-center gap-2">
                                {suggestedPrompts.map((prompt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>);
                                        }}
                                        className="px-4 py-2 glass-card text-sm hover:border-green-500/40 transition-colors"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))
                    )}

                    {isLoading && (
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="spinner" />
                            <span>Thinking...</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error.message || "Something went wrong. Please try again."}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-800 px-4 py-4">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask me about loans, pool stats, or your eligibility..."
                            className="input-field flex-1"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="btn-primary px-6"
                        >
                            {isLoading ? (
                                <span className="spinner" />
                            ) : (
                                "Send"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

function MessageBubble({ message }: { message: { role: string; content: string; toolInvocations?: Array<{ toolName: string; result?: { message?: string } }> } }) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
                        ? "bg-green-500/20 border border-green-500/30 text-white"
                        : "glass-card text-gray-100"
                    }`}
            >
                {/* Message content */}
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Tool results */}
                {message.toolInvocations?.map((tool, i) => (
                    <div key={i} className="mt-3 pt-3 border-t border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">
                            📊 {tool.toolName}
                        </div>
                        {tool.result?.message && (
                            <p className="text-sm text-gray-300">{tool.result.message}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
