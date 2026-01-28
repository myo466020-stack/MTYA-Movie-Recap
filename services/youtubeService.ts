
/**
 * Extracts the YouTube video ID from various URL formats.
 * @param url The YouTube URL.
 * @returns The video ID or null if not found.
 */
function extractVideoId(url: string): string | null {
  // This regex covers:
  // - youtu.be/VIDEO_ID
  // - youtube.com/watch?v=VIDEO_ID
  // - youtube.com/embed/VIDEO_ID
  // - youtube.com/v/VIDEO_ID
  // - youtube.com/shorts/VIDEO_ID
  // - URLs with other parameters before or after the video ID
  const regex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regex);

  // The video ID is in the second capture group (match[2]) and should be 11 characters long.
  if (match && match[2].length === 11) {
    return match[2];
  } else {
    return null;
  }
}

/**
 * Fetches the transcript for a given YouTube URL using a public API to avoid CORS issues.
 * @param url The YouTube URL of the video.
 * @returns A promise that resolves to the full transcript as a single string.
 */
export async function fetchTranscript(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL provided. Please check the link and try again.");
  }

  // Use a public API that wraps transcript fetching to avoid browser CORS issues.
  const apiUrl = `https://youtubetranscript.com/api/?video_id=${videoId}`;

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      // Handle cases where the transcript doesn't exist or another error occurred.
      throw new Error("No transcript found for this video. It might have subtitles disabled or be a private video.");
    }
    
    const transcriptParts = await response.json();

    if (!transcriptParts || transcriptParts.length === 0) {
      throw new Error("No transcript found for this video. It might have subtitles disabled.");
    }
    
    // Concatenate all parts of the transcript into a single string.
    return transcriptParts.map((part: { text: string }) => part.text).join(' ');
  } catch (error: any) {
    console.error("YouTube transcript fetch error:", error);
    // Re-throw a user-friendly error message.
    throw new Error("Failed to fetch transcript. Please ensure the video has subtitles enabled and the URL is correct.");
  }
}
