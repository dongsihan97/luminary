import { useState, useRef, useEffect } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { generateThumbnail, uploadArtPhoto, insertArtEntry, updateArtEntry, convertIfHeic } from "./artService.js";

async function getCroppedBlob(imgEl, crop) {
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const canvas = document.createElement("canvas");
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  canvas.getContext("2d").drawImage(
    imgEl,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height
  );
  return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.95));
}

export const MOOD_VOCABULARY = [
  "awe", "melancholy", "energized", "still",
  "curious", "moved", "restless", "joyful",
  "contemplative", "unsettled", "inspired", "tender",
];

const labelStyle = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#999",
  display: "block",
  marginBottom: 6,
  marginTop: 24,
};

const inputStyle = {
  width: "100%",
  border: "none",
  borderBottom: "1px solid #d4d4d4",
  outline: "none",
  padding: "8px 0",
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 18,
  color: "#1a1a1a",
  background: "transparent",
  boxSizing: "border-box",
};

export default function CaptureModal({ onClose, onSaved, entry }) {
  const isEditing = !!entry;
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(isEditing ? entry.photo_thumb_url : null);
  const [reaction, setReaction] = useState(isEditing ? (entry.emotional_reaction || "") : "");
  const [artistName, setArtistName] = useState(isEditing ? (entry.artist_name || "") : "");
  const [artTitle, setArtTitle] = useState(isEditing ? (entry.title || "") : "");
  const [selectedMoods, setSelectedMoods] = useState(isEditing ? (entry.mood_tags || []) : []);
  const [venueName, setVenueName] = useState(isEditing ? (entry.venue_name || "") : "");
  const [locationLat, setLocationLat] = useState(isEditing ? entry.location_lat : null);
  const [locationLng, setLocationLng] = useState(isEditing ? entry.location_lng : null);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [converting, setConverting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const venueInputRef = useRef(null);
  const cropImgRef = useRef(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !venueInputRef.current) return;

    const init = () => {
      if (!window.google?.maps?.places || !venueInputRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(venueInputRef.current, {
        types: ["establishment"],
        fields: ["name", "geometry"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.name) setVenueName(place.name);
        if (place.geometry?.location) {
          setLocationLat(place.geometry.location.lat());
          setLocationLng(place.geometry.location.lng());
        }
      });
    };

    if (window.google?.maps?.places) {
      init();
      return;
    }

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", init);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  const handleFile = async (e) => {
    const raw = e.target.files[0];
    if (!raw) return;
    setConverting(true);
    try {
      const file = await convertIfHeic(raw);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(URL.createObjectURL(file));
      setPhoto(file);
      setCrop(null);
      setCompletedCrop(null);
    } finally {
      setConverting(false);
    }
  };

  const handleCropConfirm = async () => {
    if (completedCrop?.width && completedCrop?.height && cropImgRef.current) {
      const blob = await getCroppedBlob(cropImgRef.current, completedCrop);
      const croppedFile = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      if (preview && !preview.startsWith("http")) URL.revokeObjectURL(preview);
      setPhoto(croppedFile);
      setPreview(URL.createObjectURL(croppedFile));
    } else {
      if (preview && !preview.startsWith("http")) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(photo));
    }
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPhoto(null);
    setCrop(null);
    setCompletedCrop(null);
  };

  const toggleMood = (mood) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const canSave = (isEditing ? true : !!photo) && reaction.trim();

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      let thumbUrl = isEditing ? entry.photo_thumb_url : null;
      let fullUrl = isEditing ? entry.photo_full_url : null;

      // Upload new photos only if a new file was selected
      if (photo) {
        const entryId = isEditing ? entry.id : crypto.randomUUID();
        const thumbBlob = await generateThumbnail(photo, 400);
        try {
          [thumbUrl, fullUrl] = await Promise.all([
            uploadArtPhoto(thumbBlob, entryId, "thumb"),
            uploadArtPhoto(photo, entryId, "full"),
          ]);
        } catch (storageErr) {
          throw new Error(`Storage upload failed: ${storageErr.message}`);
        }
      }

      const fields = {
        photo_thumb_url: thumbUrl,
        photo_full_url: fullUrl,
        emotional_reaction: reaction.trim(),
        artist_name: artistName.trim() || null,
        title: artTitle.trim() || null,
        mood_tags: selectedMoods,
        venue_name: venueName.trim() || null,
        location_lat: locationLat,
        location_lng: locationLng,
      };

      let saved;
      try {
        if (isEditing) {
          saved = await updateArtEntry(entry.id, fields);
        } else {
          saved = await insertArtEntry({
            id: crypto.randomUUID(),
            ...fields,
            encountered_at: new Date().toISOString(),
            art_type: "painting_drawing",
          });
        }
      } catch (dbErr) {
        throw new Error(`DB ${isEditing ? "update" : "insert"} failed: ${dbErr.message}`);
      }

      if (photo && preview) URL.revokeObjectURL(preview);
      onSaved(saved);
    } catch (e) {
      setError(e.message || "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  if (cropSrc) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(250,250,248,0.98)", backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 24px 16px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: "#1a1a1a" }}>Adjust Image</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#bbb", marginTop: 4 }}>
              Drag to crop, or use full image
            </div>
          </div>
          <button
            onClick={handleCropCancel}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#bbb", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >cancel</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            style={{ maxHeight: "calc(100vh - 180px)" }}
          >
            <img
              ref={cropImgRef}
              src={cropSrc}
              alt="Crop"
              style={{ maxWidth: "100%", maxHeight: "calc(100vh - 180px)", display: "block" }}
            />
          </ReactCrop>
        </div>

        <div style={{ display: "flex", gap: 12, padding: "20px 24px 40px" }}>
          <button
            onClick={handleCropConfirm}
            style={{
              flex: 1, background: "#1a1a1a", color: "#fff", border: "none",
              padding: "14px", fontFamily: "'DM Mono', monospace", fontSize: 11,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", borderRadius: 2,
            }}
          >
            {completedCrop?.width ? "Use Crop ✦" : "Use Full Image ✦"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(250,250,248,0.96)", backdropFilter: "blur(12px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: "#1a1a1a", lineHeight: 1 }}>
              {isEditing ? "Edit Encounter" : "Log Art"}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#bbb", marginTop: 6 }}>
              {isEditing ? "Update details" : "Quick Capture"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#bbb", letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0" }}
          >
            cancel
          </button>
        </div>

        {/* Photo picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFile}
          style={{ display: "none" }}
        />
        {converting ? (
          <div style={{
            width: "100%", height: 220, border: "1px dashed #d4d4d4", borderRadius: 2,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#bbb", fontStyle: "italic" }}>
              Converting...
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#ccc", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              HEIC → JPEG
            </div>
          </div>
        ) : !preview ? (
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              width: "100%", height: 220, border: "1px dashed #d4d4d4", borderRadius: 2,
              background: "transparent", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "border-color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#aaa"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#d4d4d4"}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#bbb", fontStyle: "italic" }}>
              Add a photo
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#ccc", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Camera or library
            </div>
          </button>
        ) : (
          <div style={{ position: "relative" }}>
            <img
              src={preview}
              alt="Preview"
              style={{ width: "100%", height: "auto", borderRadius: 2, display: "block" }}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              style={{
                position: "absolute", bottom: 12, right: 12,
                background: "rgba(250,250,248,0.92)", border: "none", cursor: "pointer",
                fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "#666", padding: "6px 12px", borderRadius: 2,
              }}
            >
              Change
            </button>
          </div>
        )}

        {/* Reaction — required */}
        <label style={labelStyle}>What did this stir in you? *</label>
        <textarea
          value={reaction}
          onChange={e => setReaction(e.target.value)}
          placeholder="Write what you felt..."
          rows={3}
          style={{
            ...inputStyle, resize: "none", fontStyle: "italic", lineHeight: 1.6, fontSize: 20,
          }}
        />

        {/* Mood tags */}
        <label style={labelStyle}>Mood</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MOOD_VOCABULARY.map(mood => (
            <button
              key={mood}
              onClick={() => toggleMood(mood)}
              style={{
                padding: "4px 12px",
                border: "1px solid",
                borderColor: selectedMoods.includes(mood) ? "#1a1a1a" : "#d4d4d4",
                borderRadius: 2,
                background: selectedMoods.includes(mood) ? "#1a1a1a" : "transparent",
                color: selectedMoods.includes(mood) ? "#fff" : "#888",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {mood}
            </button>
          ))}
        </div>

        {/* Artist & Title — optional */}
        <label style={labelStyle}>Artist</label>
        <input
          value={artistName}
          onChange={e => setArtistName(e.target.value)}
          placeholder="Optional"
          style={inputStyle}
        />

        <label style={labelStyle}>Title</label>
        <input
          value={artTitle}
          onChange={e => setArtTitle(e.target.value)}
          placeholder="Optional"
          style={inputStyle}
        />

        <label style={labelStyle}>Venue</label>
        <div style={{ position: "relative" }}>
          <input
            ref={venueInputRef}
            value={venueName}
            onChange={e => {
              setVenueName(e.target.value);
              if (!e.target.value) { setLocationLat(null); setLocationLng(null); }
            }}
            placeholder="Search for a museum, gallery..."
            style={inputStyle}
          />
          {locationLat && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#bbb", marginTop: 4,
            }}>
              ✦ Location confirmed
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 16, color: "#c0392b", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            marginTop: 36,
            background: "#1a1a1a", color: "#fff", border: "none",
            padding: "14px 36px",
            fontFamily: "'DM Mono', monospace", fontSize: 11,
            letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: canSave && !saving ? "pointer" : "default",
            borderRadius: 2,
            opacity: (!canSave || saving) ? 0.4 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {saving ? "Saving..." : isEditing ? "Update ✦" : "Save ✦"}
        </button>
      </div>
    </div>
  );
}
