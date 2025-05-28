import { useState } from "react";

export function useDraftMessage() {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");

  const generateDraft = async (contact: { name: string; category: string }, messages: string[] = []) => {
    setLoading(true);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, messages }),
      });
      const data = await res.json();
      if (data.draft && typeof data.draft === "string") {
        setDraft(data.draft);
return data.draft;
      } else {
        console.warn("Unexpected draft response:", data);
       setDraft("");
return "";
      }
    } catch (err) {
      console.error("Failed to fetch draft:", err);
      setDraft("");
    } finally {
      setLoading(false);
    }
  };

  return { draft, loading, generateDraft, setDraft };
}