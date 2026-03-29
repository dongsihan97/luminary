import { useState } from "react";
import CaptureModal from "./CaptureModal.jsx";
import MapView from "./MapView.jsx";
import { deleteArtEntry } from "./artService.js";

const PAGE_SIZE = 10;

function ArtCard({ entry, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const hasArtist = entry.artist_name || entry.title;
  const date = new Date(entry.encountered_at).toLocaleDateString("en-US", {
    month: "short", year: "numeric",
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", borderTop: "1px solid #e8e8e8", paddingTop: 16 }}
    >
      {(entry.photo_full_url || entry.photo_thumb_url) && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <img
            src={entry.photo_full_url || entry.photo_thumb_url}
            alt={entry.title || "Art encounter"}
            style={{
              width: "100%", height: "auto", display: "block", borderRadius: 2,
            }}
          />
          {hovered && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: 2,
              background: "rgba(250,250,248,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            }}>
              <button
                onClick={() => onEdit(entry)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: "#666",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#1a1a1a"}
                onMouseLeave={e => e.currentTarget.style.color = "#666"}
              >edit</button>
              <span style={{ color: "#ccc", fontSize: 10 }}>·</span>
              <button
                onClick={() => onDelete(entry.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: "#666",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#c0392b"}
                onMouseLeave={e => e.currentTarget.style.color = "#666"}
              >delete</button>
            </div>
          )}
        </div>
      )}
      {hasArtist && (
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: "#999", marginBottom: 6,
        }}>
          {[entry.artist_name, entry.title].filter(Boolean).join(" · ")}
        </div>
      )}
      <div style={{
        fontFamily: "'Cormorant Garamond', serif", fontSize: 15,
        fontStyle: "italic", color: "#444", lineHeight: 1.55,
        display: "-webkit-box", WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        "{entry.emotional_reaction}"
      </div>
      {entry.mood_tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {entry.mood_tags.map(mood => (
            <span key={mood} style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#bbb", border: "1px solid #ebebeb",
              padding: "2px 8px", borderRadius: 2,
            }}>
              {mood}
            </span>
          ))}
        </div>
      )}
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: "#ccc", marginTop: 10,
      }}>
        {date}
      </div>
    </div>
  );
}

export default function ArtView({ entries, onEntryAdded, onEntryUpdated, onEntryDeleted }) {
  const [capturing, setCapturing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id) => {
    await deleteArtEntry(id);
    onEntryDeleted(id);
    // If deleting last item on page, go back
    if (pageEntries.length === 1 && page > 1) setPage(p => p - 1);
  };

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 36 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#1a1a1a" }}>
            Art Encounters
          </div>
          {entries.length > 0 && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#bbb", marginTop: 4,
            }}>
              {entries.length} {entries.length === 1 ? "piece" : "pieces"} captured
            </div>
          )}
        </div>
        <button
          onClick={() => setCapturing(true)}
          style={{
            background: "#1a1a1a", color: "#fff", border: "none",
            padding: "10px 22px",
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", borderRadius: 2,
          }}
        >
          ✦ Log Art
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#bbb" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontStyle: "italic", marginBottom: 8 }}>
            No encounters yet.
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Capture something that moves you.
          </div>
        </div>
      )}

      {/* Grid */}
      {entries.length > 0 && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "32px 24px",
          }}>
            {pageEntries.map(entry => (
              <ArtCard key={entry.id} entry={entry} onEdit={setEditingEntry} onDelete={handleDelete} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 16, marginTop: 48,
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  background: "none", border: "none", cursor: page === 1 ? "default" : "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: page === 1 ? "#ddd" : "#999",
                  transition: "color 0.15s",
                }}
              >
                ← prev
              </button>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                letterSpacing: "0.06em", color: "#bbb",
              }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  background: "none", border: "none", cursor: page === totalPages ? "default" : "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: page === totalPages ? "#ddd" : "#999",
                  transition: "color 0.15s",
                }}
              >
                next →
              </button>
            </div>
          )}

          {/* Map */}
          <div style={{ marginTop: 64, borderTop: "1px solid #e8e8e8", paddingTop: 48 }}>
            <MapView artEntries={entries} />
          </div>
        </>
      )}

      {(capturing || editingEntry) && (
        <CaptureModal
          entry={editingEntry}
          onClose={() => { setCapturing(false); setEditingEntry(null); }}
          onSaved={(saved) => {
            if (editingEntry) {
              onEntryUpdated(saved);
            } else {
              onEntryAdded(saved);
            }
            setCapturing(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}
