export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

/**
 * Robust parser for WebVTT and SRT subtitles from DramaWave / Free-Reels CDN.
 * Handles:
 * - STYLE ::cue(...) CSS blocks
 * - NOTE metadata blocks
 * - HTML/VTT markup like <c.f78c>, </c.f78c>, <v Speaker>, <b>, <i>, etc.
 * - Both comma and dot milliseconds (00:00:00,000 and 00:00:00.000)
 * - Cue settings (line:..., position:..., align:...)
 * - HTML entities (&amp;, &lt;, etc.)
 */
export function parseSubtitles(raw: string): SubtitleCue[] {
  if (!raw || typeof raw !== 'string') return [];

  // Remove STYLE and NOTE blocks
  const clean = raw
    .replace(/STYLE[\s\S]*?(?=\n\s*(?:\d+|\d{2}:|\r?\n\r?\n|$))/gi, '')
    .replace(/NOTE[\s\S]*?(?=\n\s*(?:\d+|\d{2}:|\r?\n\r?\n|$))/gi, '');

  const blocks = clean.split(/\r?\n\r?\n+/);
  const cues: SubtitleCue[] = [];
  const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let timeMatch: RegExpMatchArray | null = null;
    const textLines: string[] = [];

    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        timeMatch = match;
      } else if (timeMatch) {
        // Strip tags and HTML entities
        const cleaned = line
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .trim();

        if (cleaned && !cleaned.startsWith('WEBVTT') && !cleaned.startsWith('::cue')) {
          textLines.push(cleaned);
        }
      }
    }

    if (timeMatch && textLines.length > 0) {
      const sH = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
      const sM = parseInt(timeMatch[2], 10);
      const sS = parseInt(timeMatch[3], 10);
      const sMs = parseInt(timeMatch[4], 10);
      const start = sH * 3600 + sM * 60 + sS + sMs / 1000;

      const eH = timeMatch[5] ? parseInt(timeMatch[5], 10) : 0;
      const eM = parseInt(timeMatch[6], 10);
      const eS = parseInt(timeMatch[7], 10);
      const eMs = parseInt(timeMatch[8], 10);
      const end = eH * 3600 + eM * 60 + eS + eMs / 1000;

      const fullText = textLines.join('\n');
      if (fullText && end > start) {
        cues.push({ start, end, text: fullText });
      }
    }
  }

  // Sort cues by start time
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Returns formatted subtitle text for a given timestamp.
 * Handles simultaneous/overlapping cues (e.g. speaker name + spoken dialogue).
 */
export function getActiveSubtitleText(cues: SubtitleCue[], currentTime: number): string {
  if (!cues || cues.length === 0) return '';

  const active = cues.filter((c) => currentTime >= c.start && currentTime <= c.end);
  if (active.length === 0) return '';

  // Filter duplicates
  const uniqueTexts: string[] = [];
  for (const item of active) {
    if (!uniqueTexts.includes(item.text)) {
      uniqueTexts.push(item.text);
    }
  }

  return uniqueTexts.join('\n');
}
