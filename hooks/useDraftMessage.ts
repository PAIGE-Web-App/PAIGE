import { useState } from "react";
import { useCredits } from "@/contexts/CreditContext";

export function useDraftMessage() {
  const { refreshCredits } = useCredits();
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");

  const generateDraft = async (contact: { name: string; category: string }, messages: string[] = [], userId?: string, userData?: any, onCreditError?: (error: any) => void) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userId) {
        headers["x-user-id"] = userId;
      }
      
      const res = await fetch("/api/draft", {
        method: "POST",
        headers,
        body: JSON.stringify({ contact, messages, userData }), // Remove userId from body since it's in headers
      });
      
      let data;
      
      // Check if response is successful first
      if (!res.ok) {
        // Handle error responses
        const contentType = res.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (error) {
            console.error("Failed to parse error response:", error);
            setDraft("");
            return "";
          }
        } else {
          // Read as text for non-JSON error responses
          const textResponse = await res.text();
          console.warn("Non-JSON error response from draft API:", textResponse);
          
          // Check if it's a credit-related error in text
          if (textResponse.includes('Insufficient credits') || textResponse.includes('Not enough credits')) {
            if (onCreditError) {
              onCreditError({ error: textResponse });
            }
            setDraft("");
            return "";
          }
          
          // Handle other text errors
          console.warn("Draft generation failed:", textResponse);
          setDraft("");
          return "";
        }
        
        // Check if it's a credit-related error
        if (data && data.error && (data.error.includes('Insufficient credits') || data.error.includes('Not enough credits'))) {
          if (onCreditError) {
            onCreditError(data);
          }
          setDraft("");
          return "";
        }
        
        // Handle other errors
        console.warn("Draft generation failed:", data || 'Unknown error');
        setDraft("");
        return "";
      }
      
      // Response is successful, parse JSON
      try {
        data = await res.json();
      } catch (error) {
        console.error("Failed to parse successful response:", error);
        setDraft("");
        return "";
      }
      
      // Handle successful response
      if (data.draft && typeof data.draft === "string") {
        setDraft(data.draft);
        
        // Refresh credits after successful completion
        try {
          await refreshCredits();
        } catch (refreshError) {
          console.warn('Failed to refresh credits after draft generation:', refreshError);
        }
        
        return data.draft;
      } else {
        console.warn("Unexpected draft response:", data);
        setDraft("");
        return "";
      }
    } catch (err) {
      console.error("Failed to fetch draft:", err);
      setDraft("");
      return "";
    } finally {
      setLoading(false);
    }
  };

  return { draft, loading, generateDraft, setDraft };
}