'use client';
import React, { useState } from "react";

export default function BlankTestPage() {
  const [mlStatus, setMlStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleTestML = async () => {
    setLoading(true);
    setMlStatus("");
    try {
      const res = await fetch("/api/test-ml-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Say hello!" }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setMlStatus("ML working");
      } else {
        setMlStatus("ML agent error: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      setMlStatus("ML agent error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linen">
      <div className="bg-white border border-[#AB9C95] rounded-[10px] shadow-md p-8 w-full max-w-xl flex flex-col items-center">
        <h1 className="text-2xl font-playfair font-semibold text-[#332B42] mb-2">Blank Test Page</h1>
        <p className="text-base text-[#364257] mb-6 text-center">
          Use this page to prototype and test new features or components. Add your test code below.
        </p>
        <button
          className="btn-primary px-6 py-2 rounded-[8px] font-semibold text-base mb-4"
          onClick={handleTestML}
          disabled={loading}
        >
          {loading ? "Testing..." : "Run Custom AI Function"}
        </button>
        {mlStatus && (
          <div className="mt-2 text-green-700 font-semibold">{mlStatus}</div>
        )}
      </div>
    </div>
  );
} 