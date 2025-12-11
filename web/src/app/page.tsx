'use client';

import { useMemo, useState } from "react";

type UploadResult = {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  thumbnailPrompt: string;
  scheduledAt: string | null;
  monetization: string;
  category: string;
  status: string;
  videoId: string | null;
};

const CATEGORIES = [
  { value: "tech", label: "Tech" },
  { value: "vlog", label: "Vlog" },
  { value: "shorts", label: "Shorts" },
  { value: "gaming", label: "Gaming" },
  { value: "tutorial", label: "Tutorial" },
] as const;

const MONETIZATION_OPTIONS = [
  { value: "enabled", label: "Enable ads" },
  { value: "disabled", label: "Disable ads" },
  { value: "limited", label: "Limited ads" },
  { value: "kids", label: "Made for kids" },
] as const;

export default function Home() {
  const [videoMode, setVideoMode] = useState<"file" | "link">("file");
  const [language, setLanguage] = useState("English");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("tech");
  const [monetization, setMonetization] =
    useState<(typeof MONETIZATION_OPTIONS)[number]["value"]>("enabled");
  const [scheduled, setScheduled] = useState<string>("");
  const [videoLink, setVideoLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const scheduledDisplay = useMemo(() => {
    if (!result?.scheduledAt) return "Immediately";
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(result.scheduledAt));
    } catch {
      return result.scheduledAt;
    }
  }, [result]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("videoSourceType", videoMode);
    formData.set("language", language.trim());
    formData.set("category", category);
    formData.set("monetization", monetization);

    if (scheduled.trim().length > 0) {
      formData.set("schedule", scheduled);
    } else {
      formData.delete("schedule");
    }

    if (videoMode === "link") {
      if (videoLink.trim().length === 0) {
        setError("Video link is required for link uploads.");
        return;
      }
      formData.set("videoLink", videoLink.trim());
      formData.delete("videoFile");
    } else {
      const file = formData.get("videoFile");
      if (!file || (file instanceof File && file.size === 0)) {
        setError("Please choose a video file.");
        return;
      }
      formData.delete("videoLink");
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed. Please try again.");
      }

      const data: UploadResult = await response.json();
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-800 text-zinc-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.4em] text-zinc-500">
            Automated Publishing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            YouTube Upload Agent
          </h1>
          <p className="max-w-2xl text-lg text-zinc-300">
            Drop a video or link, choose your publishing strategy, and let the agent handle
            the SEO recipe, monetization posture, scheduling, and final upload in one
            streamlined flow.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30 backdrop-blur"
          >
            <fieldset className="flex gap-3 rounded-full bg-black/40 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setVideoMode("file")}
                className={`flex-1 rounded-full px-4 py-2 transition ${
                  videoMode === "file"
                    ? "bg-white text-black shadow-lg"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setVideoMode("link")}
                className={`flex-1 rounded-full px-4 py-2 transition ${
                  videoMode === "link"
                    ? "bg-white text-black shadow-lg"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Use video link
              </button>
            </fieldset>

            {videoMode === "file" ? (
              <label className="group flex flex-col gap-2 rounded-xl border border-dashed border-white/20 bg-black/40 p-6 text-sm text-zinc-300 transition hover:border-white/40">
                <span className="font-medium text-white">Video file</span>
                <span className="text-xs text-zinc-400">
                  Accepts MP4, MOV, MKV, WEBM up to 512 MB.
                </span>
                <input
                  type="file"
                  name="videoFile"
                  accept="video/mp4,video/mov,video/quicktime,video/x-matroska,video/webm,video/x-msvideo"
                  className="mt-3 block w-full cursor-pointer rounded-lg border border-white/10 bg-black/60 p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
                  required={videoMode === "file"}
                />
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                <span className="font-medium text-white">Video link</span>
                <input
                  type="url"
                  name="videoLink"
                  value={videoLink}
                  onChange={(event) => setVideoLink(event.target.value)}
                  placeholder="https://..."
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
                />
              </label>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                <span className="font-medium text-white">Category</span>
                <select
                  name="category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as (typeof CATEGORIES)[number]["value"])
                  }
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
                >
                  {CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-zinc-300">
                <span className="font-medium text-white">Language</span>
                <input
                  type="text"
                  name="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
                  placeholder="English"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              <span className="font-medium text-white">Monetization preference</span>
              <select
                name="monetization"
                value={monetization}
                onChange={(event) =>
                  setMonetization(
                    event.target.value as (typeof MONETIZATION_OPTIONS)[number]["value"],
                  )
                }
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
              >
                {MONETIZATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              <span className="font-medium text-white">Schedule (optional)</span>
              <input
                type="datetime-local"
                name="schedule"
                value={scheduled}
                onChange={(event) => setScheduled(event.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
              />
              <span className="text-xs text-zinc-500">
                Leave blank to publish immediately after upload.
              </span>
            </label>

            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 text-base font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <span className="h-2 w-2 animate-ping rounded-full bg-black" />
                  Uploading...
                </>
              ) : (
                "Generate SEO + Upload"
              )}
            </button>
          </form>

          <aside className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30 backdrop-blur">
            <header className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold text-white">Final upload summary</h2>
              <p className="text-sm text-zinc-400">
                Agents generate metadata automatically once the video finishes uploading.
              </p>
            </header>

            {result ? (
              <div className="flex flex-col gap-5 text-sm leading-relaxed text-zinc-200">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Video title</p>
                  <p className="mt-1 text-lg font-semibold text-white">{result.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Video description
                  </p>
                  <pre className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/40 p-4 text-xs text-zinc-200">
                    {result.description}
                  </pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Tags</p>
                  <p className="mt-1 text-xs text-zinc-300">{result.tags.join(", ")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Hashtags</p>
                  <p className="mt-1 text-xs text-zinc-300">{result.hashtags.join(" ")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Thumbnail prompt
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">{result.thumbnailPrompt}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs text-zinc-300 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Scheduled publish
                    </p>
                    <p className="mt-1">{scheduledDisplay}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Monetization
                    </p>
                    <p className="mt-1 capitalize">{result.monetization}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Privacy status
                    </p>
                    <p className="mt-1 capitalize">{result.status}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      YouTube video ID
                    </p>
                    <p className="mt-1 font-mono text-zinc-200">
                      {result.videoId ?? "pending"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-start justify-center gap-4 rounded-xl border border-dashed border-white/10 bg-black/30 p-6 text-sm text-zinc-400">
                <p>No upload yet.</p>
                <p>
                  Once the agent publishes, you will see the full SEO package and scheduling
                  confirmation here automatically.
                </p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
