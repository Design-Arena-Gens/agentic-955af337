import { NextResponse } from "next/server";
import { z } from "zod";

import { generateMetadata, type UploadCategory } from "@/lib/metadata";
import { uploadToYouTube } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_VIDEO_BYTES = 1024 * 1024 * 512; // 512 MB

const formSchema = z.object({
  category: z.enum(["tech", "vlog", "shorts", "gaming", "tutorial"]),
  language: z.string().min(2).max(60),
  monetization: z.string().min(2).max(80),
  schedule: z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value.length === 0 ||
        !Number.isNaN(Date.parse(value)),
      "Invalid schedule timestamp.",
    ),
  videoSourceType: z.enum(["file", "link"]),
  videoLink: z
    .string()
    .url()
    .optional(),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const rawPayload = {
      category: String(formData.get("category") ?? ""),
      language: String(formData.get("language") ?? "English"),
      monetization: String(formData.get("monetization") ?? "enabled"),
      schedule: formData.get("schedule") ? String(formData.get("schedule")) : undefined,
      videoSourceType: String(formData.get("videoSourceType") ?? "file"),
      videoLink: formData.get("videoLink") ? String(formData.get("videoLink")) : undefined,
    };

    const parsed = formSchema.safeParse(rawPayload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid form input.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { category, language, monetization, schedule, videoSourceType, videoLink } =
      parsed.data;

    const { buffer, fileName } = await resolveVideoSource({
      formData,
      videoSourceType,
      videoLink,
    });

    if (buffer.byteLength > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        {
          error: "Video exceeds 512 MB upload limit.",
        },
        { status: 413 },
      );
    }

    const publishAt =
      schedule && schedule.length > 0 && !Number.isNaN(Date.parse(schedule))
        ? new Date(schedule).toISOString()
        : undefined;

    const metadata = generateMetadata({
      rawTitleSource: fileName || videoLink || "youtube upload",
      category: category as UploadCategory,
      language,
      monetization,
      scheduledAt: publishAt,
    });

    const youtubeResponse = await uploadToYouTube({
      metadata,
      buffer,
      fileName: fileName || "upload.mp4",
      category: category as UploadCategory,
      language,
      monetization,
      privacyStatus: publishAt ? "private" : "public",
      publishAt,
    });

    return NextResponse.json({
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      hashtags: metadata.hashtags,
      thumbnailPrompt: metadata.thumbnailPrompt,
      keywordPhrases: metadata.keywordPhrases,
      scheduledAt: publishAt ?? null,
      monetization,
      category,
      status: youtubeResponse.status?.privacyStatus ?? (publishAt ? "private" : "public"),
      videoId: youtubeResponse.id ?? null,
    });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Video upload failed.",
      },
      { status: 500 },
    );
  }
}

async function resolveVideoSource({
  formData,
  videoSourceType,
  videoLink,
}: {
  formData: FormData;
  videoSourceType: "file" | "link";
  videoLink?: string;
}): Promise<{ buffer: Buffer; fileName: string }> {
  if (videoSourceType === "file") {
    const file = formData.get("videoFile");
    if (!file || typeof file === "string") {
      throw new Error("Video file is required.");
    }

    const arrayBuffer = await file.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      fileName: file.name || "upload.mp4",
    };
  }

  if (!videoLink) {
    throw new Error("Video link is required when no file upload is provided.");
  }

  const response = await fetch(videoLink);
  if (!response.ok) {
    throw new Error(`Failed to download video from link: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const resolvedFileName = inferFileNameFromLink({
    url: videoLink,
    contentType: response.headers.get("content-type") ?? "",
  });

  return {
    buffer: Buffer.from(arrayBuffer),
    fileName: resolvedFileName,
  };
}

function inferFileNameFromLink({
  url,
  contentType,
}: {
  url: string;
  contentType: string;
}): string {
  try {
    const parsed = new URL(url);
    const base = parsed.pathname.split("/").filter(Boolean).pop() ?? "remote-upload";
    if (/\.[a-z0-9]+$/i.test(base)) {
      return base;
    }

    const extension = contentTypeToExtension(contentType);
    return `${base}.${extension}`;
  } catch {
    return "remote-upload.mp4";
  }
}

function contentTypeToExtension(contentType: string): string {
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("x-matroska")) return "mkv";
  if (contentType.includes("x-msvideo")) return "avi";
  return "mp4";
}
