import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PRESET_TAGS = ["Resilience", "Love", "Work", "Philosophy", "Creativity", "Leadership", "Life", "Wisdom", "Courage", "Clarity"];

async function loadQuotes() {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) return [];
  return data.map(({ added_at, ...rest }) => ({ ...rest, addedAt: added_at }));
}

async function insertQuote(quote) {
  const { addedAt, ...rest } = quote;
  await supabase.from("quotes").insert({ ...rest, added_at: addedAt });
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Tiny Components ────────────────────────────────────────────────────────

function Tag({ label, active, onClick, removable, onRemove }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        border: "1px solid",
        borderColor: active ? "#1a1a1a" : "#d4d4d4",
        borderRadius: 2,
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: onClick ? "pointer" : "default",
        background: active ? "#1a1a1a" : "transparent",
        color: active ? "#fff" : "#666",
        userSelect: "none",
        transition: "all 0.15s ease",
      }}
    >
      {label}
      {removable && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ marginLeft: 2, cursor: "pointer", opacity: 0.6, fontSize: 13, lineHeight: 1 }}
        >
          ×
        </span>
      )}
    </span>
  );
}

function QuoteCard({ quote, featured }) {
  return (
    <div
      style={{
        borderTop: featured ? "2px solid #1a1a1a" : "1px solid #e8e8e8",
        padding: featured ? "32px 0 28px" : "24px 0",
        transition: "opacity 0.2s",
      }}
    >
      {featured && (
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999", marginBottom: 16 }}>
          ✦ Today's Quote
        </div>
      )}
      <blockquote style={{
        margin: 0,
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: featured ? 26 : 20,
        lineHeight: 1.55,
        color: "#1a1a1a",
        fontStyle: "italic",
        fontWeight: 400,
      }}>
        "{quote.text}"
      </blockquote>
      <div style={{
        marginTop: 14,
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: "#888",
        letterSpacing: "0.04em",
      }}>
        — {quote.author}{quote.source ? `, ${quote.source}` : ""}
      </div>
      {quote.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {quote.tags.map(t => <Tag key={t} label={t} />)}
        </div>
      )}
    </div>
  );
}

// ─── Views ───────────────────────────────────────────────────────────────────

function LibraryView({ quotes }) {
  const [filter, setFilter] = useState(null);
  const [randomQuote, setRandomQuote] = useState(null);

  useEffect(() => {
    if (quotes.length > 0) {
      setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [quotes.length]);

  const allTags = [...new Set(quotes.flatMap(q => q.tags || []))];
  const filtered = filter ? quotes.filter(q => q.tags?.includes(filter)) : quotes;

  if (quotes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#bbb" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: "italic", marginBottom: 8 }}>
          Your library is empty.
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Add your first quote to begin.
        </div>
      </div>
    );
  }

  return (
    <div>
      {randomQuote && <QuoteCard quote={randomQuote} featured />}

      {allTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "20px 0", borderTop: "1px solid #e8e8e8" }}>
          <Tag label="All" active={!filter} onClick={() => setFilter(null)} />
          {allTags.map(t => (
            <Tag key={t} label={t} active={filter === t} onClick={() => setFilter(filter === t ? null : t)} />
          ))}
        </div>
      )}

      <div>
        {filtered.map(q => <QuoteCard key={q.id} quote={q} />)}
      </div>
    </div>
  );
}

function AddView({ onAdd }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [source, setSource] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !selectedTags.includes(t)) {
      setSelectedTags(prev => [...prev, t]);
      setCustomTag("");
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || !author.trim()) return;
    onAdd({ id: generateId(), text: text.trim(), author: author.trim(), source: source.trim(), tags: selectedTags, addedAt: Date.now() });
    setText(""); setAuthor(""); setSource(""); setSelectedTags([]); setCustomTag("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  const inputStyle = {
    width: "100%",
    border: "none",
    borderBottom: "1px solid #d4d4d4",
    outline: "none",
    padding: "10px 0",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 18,
    color: "#1a1a1a",
    background: "transparent",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#999",
    display: "block",
    marginBottom: 4,
    marginTop: 28,
  };

  return (
    <div style={{ width: "100%" }}>
      <label style={labelStyle}>Quote *</label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write the quote here..."
        rows={4}
        style={{ ...inputStyle, resize: "vertical", fontStyle: "italic", lineHeight: 1.6, fontSize: 20 }}
      />

      <label style={labelStyle}>Author *</label>
      <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Who said it?" style={inputStyle} />

      <label style={labelStyle}>Source (book, talk, etc.)</label>
      <input value={source} onChange={e => setSource(e.target.value)} placeholder="Optional — book title, interview, etc." style={inputStyle} />

      <label style={{ ...labelStyle, marginTop: 32 }}>Tags</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {PRESET_TAGS.map(t => (
          <Tag key={t} label={t} active={selectedTags.includes(t)} onClick={() => toggleTag(t)} />
        ))}
        {selectedTags.filter(t => !PRESET_TAGS.includes(t)).map(t => (
          <Tag key={t} label={t} active removable onRemove={() => setSelectedTags(prev => prev.filter(x => x !== t))} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={customTag}
          onChange={e => setCustomTag(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCustomTag()}
          placeholder="Custom tag..."
          style={{ ...inputStyle, fontSize: 13, fontFamily: "'DM Mono', monospace", flex: 1 }}
        />
        <button onClick={addCustomTag} style={{
          background: "none", border: "1px solid #d4d4d4", cursor: "pointer", padding: "6px 14px",
          fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", color: "#666", borderRadius: 2
        }}>Add</button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || !author.trim()}
        style={{
          marginTop: 36,
          background: submitted ? "#4a9a6e" : "#1a1a1a",
          color: "#fff",
          border: "none",
          padding: "14px 36px",
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          borderRadius: 2,
          opacity: (!text.trim() || !author.trim()) ? 0.4 : 1,
          transition: "all 0.2s",
        }}
      >
        {submitted ? "✓ Saved" : "Save Quote"}
      </button>
    </div>
  );
}

function AskView({ quotes }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);
  const answerRef = useRef(null);

  const ask = async () => {
    if (!question.trim() || quotes.length === 0) return;
    setLoading(true);
    setAnswer(null);
    setError(null);

    const quotesContext = quotes.map((q, i) =>
      `[Quote ${i + 1}] "${q.text}" — ${q.author}${q.source ? `, ${q.source}` : ""}`
    ).join("\n\n");

    const systemPrompt = `You are a personal wisdom guide who speaks ONLY through the user's own curated quote library. 

Your rules:
1. Answer the user's question using ONLY the quotes provided below. Do not use any outside knowledge or general advice.
2. Synthesize a thoughtful, personal response drawing from the relevant quotes.
3. At the end of your answer, list the exact quote numbers you drew from (e.g. "Sources: Quote 3, Quote 7").
4. If the library doesn't contain relevant wisdom for this question, honestly say so — do not fabricate or generalize.
5. Keep your tone warm, reflective, and direct.

THE LIBRARY:
${quotesContext}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const rawText = data.content?.map(b => b.text || "").join("") || "";

      // Parse sources from the response
      const sourceMatch = rawText.match(/Sources?:\s*(Quote[^.]+)/i);
      const usedNums = sourceMatch
        ? [...sourceMatch[1].matchAll(/Quote (\d+)/gi)].map(m => parseInt(m[1]) - 1)
        : [];

      setAnswer({
        text: rawText.replace(/Sources?:\s*Quote[^.]+\.?/i, "").trim(),
        usedQuotes: usedNums.map(i => quotes[i]).filter(Boolean),
      });

      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (quotes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#bbb" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: "italic", marginBottom: 8 }}>
          Add quotes first.
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Your library needs wisdom before it can answer.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 15,
        color: "#999",
        fontStyle: "italic",
        marginBottom: 28,
        lineHeight: 1.6,
      }}>
        Ask anything. Only your {quotes.length} saved quote{quotes.length !== 1 ? "s" : ""} will answer.
      </div>

      <textarea
        value={question}
        onChange={e => setQuestion(e.target.value)}
        onKeyDown={e => e.key === "Enter" && e.metaKey && ask()}
        placeholder="What's weighing on your mind?"
        rows={3}
        style={{
          width: "100%",
          border: "none",
          borderBottom: "2px solid #1a1a1a",
          outline: "none",
          padding: "10px 0",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22,
          color: "#1a1a1a",
          background: "transparent",
          resize: "none",
          boxSizing: "border-box",
          lineHeight: 1.5,
        }}
      />

      <button
        onClick={ask}
        disabled={loading || !question.trim()}
        style={{
          marginTop: 20,
          background: "#1a1a1a",
          color: "#fff",
          border: "none",
          padding: "14px 36px",
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          borderRadius: 2,
          opacity: (loading || !question.trim()) ? 0.4 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {loading ? "Consulting your library..." : "Ask ↵"}
      </button>

      {error && (
        <div style={{ marginTop: 24, color: "#c0392b", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
          {error}
        </div>
      )}

      {answer && (
        <div ref={answerRef} style={{ marginTop: 48 }}>
          <div style={{ borderTop: "2px solid #1a1a1a", paddingTop: 28 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999", marginBottom: 20 }}>
              ✦ From your library
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20,
              lineHeight: 1.7,
              color: "#1a1a1a",
              whiteSpace: "pre-wrap",
            }}>
              {answer.text}
            </div>

            {answer.usedQuotes.length > 0 && (
              <div style={{ marginTop: 36 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#bbb", marginBottom: 16 }}>
                  Sources used
                </div>
                {answer.usedQuotes.map(q => (
                  <div key={q.id} style={{
                    padding: "16px 0",
                    borderTop: "1px solid #f0f0f0",
                  }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontStyle: "italic", color: "#444", lineHeight: 1.55 }}>
                      "{q.text}"
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#aaa", marginTop: 8, letterSpacing: "0.04em" }}>
                      — {q.author}{q.source ? `, ${q.source}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────

export default function App() {
  const [quotes, setQuotes] = useState([]);
  const [view, setView] = useState("library");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadQuotes().then(q => { setQuotes(q); setLoaded(true); });
  }, []);

  const addQuote = async (quote) => {
    await insertQuote(quote);
    setQuotes([quote, ...quotes]);
    setView("library");
  };

  const navItems = [
    { key: "library", label: "Library" },
    { key: "add", label: "Add Quote" },
    { key: "ask", label: "Ask" },
  ];

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#ccc", letterSpacing: "0.1em" }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #fafaf8; overflow-y: scroll; }
        textarea, input { font-size: 16px; }
        textarea:focus, input:focus { border-color: #1a1a1a !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 2px; }

        @media (max-width: 600px) {
          .luminary-header-inner { padding: 0 16px !important; }
          .luminary-nav { flex-wrap: wrap; justify-content: flex-end; }
          .luminary-nav button { padding: 6px 8px !important; font-size: 10px !important; letter-spacing: 0.05em !important; }
          .luminary-main { padding: 32px 16px 80px !important; }
        }

        .light-orb {
          position: fixed;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          background: radial-gradient(circle at center, rgba(245,235,210,0.10) 0%, rgba(220,200,170,0.05) 45%, transparent 70%);
          filter: blur(28px);
          animation: bounce-light 50s ease-in-out infinite alternate;
        }
        .light-orb.orb2 {
          width: 220px;
          height: 220px;
          background: radial-gradient(circle at center, rgba(180,185,210,0.08) 0%, rgba(140,150,190,0.04) 45%, transparent 70%);
          animation: bounce-light2 70s ease-in-out infinite alternate;
          animation-delay: -22s;
        }
        @keyframes bounce-light {
          0%   { transform: translate(8vw, 12vh); }
          15%  { transform: translate(72vw, 28vh); }
          30%  { transform: translate(55vw, 75vh); }
          45%  { transform: translate(10vw, 60vh); }
          60%  { transform: translate(80vw, 10vh); }
          75%  { transform: translate(30vw, 85vh); }
          90%  { transform: translate(65vw, 50vh); }
          100% { transform: translate(15vw, 30vh); }
        }
        @keyframes bounce-light2 {
          0%   { transform: translate(60vw, 70vh); }
          20%  { transform: translate(20vw, 10vh); }
          40%  { transform: translate(75vw, 40vh); }
          60%  { transform: translate(5vw, 80vh); }
          80%  { transform: translate(50vw, 20vh); }
          100% { transform: translate(85vw, 65vh); }
        }
      `}</style>
      <div className="light-orb" />
      <div className="light-orb orb2" />

      <div style={{ minHeight: "100vh", background: "#fafaf8" }}>
        {/* Header */}
        <header style={{
          borderBottom: "1px solid #e8e8e8",
          background: "#fafaf8",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
        }}>
          <div className="luminary-header-inner" style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20,
              fontWeight: 500,
              color: "#1a1a1a",
              letterSpacing: "0.01em",
            }}>
              luminary
            </div>
            <nav className="luminary-nav" style={{ display: "flex", gap: 0 }}>
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 16px",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: view === item.key ? "#1a1a1a" : "#aaa",
                    borderBottom: view === item.key ? "1px solid rgba(26,26,26,0.35)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  {item.label}
                  {item.key === "library" && quotes.length > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.5 }}>{quotes.length}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="luminary-main" style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 96px", position: "relative", zIndex: 1 }}>
          {view === "library" && <LibraryView quotes={quotes} />}
          {view === "add" && <AddView onAdd={addQuote} />}
          {view === "ask" && <AskView quotes={quotes} />}
        </main>
      </div>
    </>
  );
}
