"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function SetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [tag, setTag] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const token = (session as { backendToken?: string })?.backendToken;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Pre-fill with Google name (no spaces)
  useEffect(() => {
    if (session?.user?.name) {
      setUsername(session.user.name.replace(/\s/g, "").slice(0, 20));
    }
    // Random 4-digit tag
    setTag(String(Math.floor(1000 + Math.random() * 9000)));
  }, [session]);

  const handleSubmit = async () => {
    if (!token) return;
    if (username.length < 2 || username.length > 20) { setError("2-20 characters"); return; }
    if (/\s/.test(username)) { setError("No spaces allowed"); return; }
    if (tag.length !== 4 || !/^\d{4}$/.test(tag)) { setError("Tag must be 4 digits"); return; }

    setSaving(true); setError("");
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: username, tag }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/lobby");
      } else {
        setError(data.error || "Failed to save");
      }
    } catch { setError("Network error"); }
    setSaving(false);
  };

  if (status === "loading") {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-bull">Bulls</span>
            <span className="text-text-dim mx-1">&</span>
            <span className="text-cow">Cows</span>
          </h1>
          <p className="text-text-muted text-sm">Choose your username and tag</p>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-5">
          {/* Username */}
          <div>
            <label className="text-xs text-text-dim mb-1.5 block font-medium">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").slice(0, 20))}
              maxLength={20}
              placeholder="CoolPlayer"
              className="w-full bg-bg-elevated border-2 border-border rounded-xl px-4 py-3 text-sm font-medium focus:border-accent focus:outline-none transition-colors"
            />
            <p className="text-[10px] text-text-dim mt-1">2-20 characters, no spaces</p>
          </div>

          {/* Tag */}
          <div>
            <label className="text-xs text-text-dim mb-1.5 block font-medium">Tag #</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-bg-elevated border-2 border-border rounded-xl px-4 py-3 flex-1">
                <span className="text-text-dim text-sm mr-1">#</span>
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  placeholder="1234"
                  className="bg-transparent text-sm font-mono font-bold focus:outline-none w-16"
                />
              </div>
              <button
                onClick={() => setTag(String(Math.floor(1000 + Math.random() * 9000)))}
                className="px-3 py-3 bg-bg-elevated border border-border rounded-xl text-text-dim hover:text-text-muted cursor-pointer transition-colors text-xs"
                title="Randomize"
              >
                Dice
              </button>
            </div>
            <p className="text-[10px] text-text-dim mt-1">Friends will add you as <span className="text-accent font-mono">{username}#{tag}</span></p>
          </div>

          {/* Preview */}
          <div className="bg-bg-elevated rounded-xl p-3 text-center">
            <p className="text-[10px] text-text-dim mb-1">Your profile</p>
            <p className="font-bold text-lg">{username || "..."}<span className="text-accent font-mono">#{tag || "0000"}</span></p>
          </div>

          {error && <p className="text-danger text-xs text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving || username.length < 2 || tag.length !== 4}
            className="w-full py-3 bg-accent text-bg font-semibold rounded-xl hover:brightness-110 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Let's Go!"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
