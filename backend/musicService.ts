import axios from 'axios';
import { Track, Collection } from '../src/types/game';
import { COLLECTIONS } from '../src/constants/collections';

export const UA_PLAYLISTS_PRESETS: Collection[] = COLLECTIONS;

export async function fetchMixedPlaylist(filters: { type: string, value: string }[], rounds: number): Promise<Track[]> {
  const allTracks: Track[] = [];
  
  // Hardcoded injection logic for "Пісня про карася" by "ФІМА"
  let injectedTrack: Track | null = null;
  const shouldInject = filters.some(f => f.type === 'collection' && (f.value === 'ua_mixed_top' || f.value === 'cringe_meme_detox'));

  if (shouldInject) {
    try {
      const response = await axios.get(`https://itunes.apple.com/search`, {
        params: {
          term: 'ФІМА Пісня про карася',
          limit: 1,
          media: 'music',
          entity: 'song'
        }
      });
      if (response.data.results.length > 0) {
        const r = response.data.results[0];
        injectedTrack = {
          id: r.trackId.toString(),
          title: r.trackName,
          artist: r.artistName,
          album: r.collectionName,
          artwork: r.artworkUrl100.replace('100x100', '600x600'),
          previewUrl: r.previewUrl
        };
      }
    } catch (e) {
      console.error("Failed to inject Karas track", e);
    }
  }

  const expandedFilters = filters.flatMap(filter => {
    if (filter.type === 'collection') {
      const collection = COLLECTIONS.find(c => c.id === filter.value);
      return collection ? collection.searchTerms.map(term => ({ type: 'collection-term', value: term })) : [];
    }
    return [filter];
  });

  for (const filter of expandedFilters) {
    try {
      const response = await axios.get(`https://itunes.apple.com/search`, {
        params: {
          term: filter.value,
          limit: Math.max(20, Math.ceil(rounds / expandedFilters.length) * 2),
          media: 'music',
          entity: 'song'
        }
      });
      
      const tracks = response.data.results.map((r: any) => ({
        id: r.trackId.toString(),
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName,
        artwork: r.artworkUrl100.replace('100x100', '600x600'),
        previewUrl: r.previewUrl
      })).filter((t: any) => t.previewUrl);
      
      allTracks.push(...tracks);
    } catch (e) {
      console.error(`Failed to fetch tracks for filter: ${filter.value}`, e);
    }
  }

  // De-duplicate by ID
  const uniqueTracks = Array.from(new Map(allTracks.map(t => [t.id, t])).values());

  // Fisher-Yates Shuffle
  for (let i = uniqueTracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueTracks[i], uniqueTracks[j]] = [uniqueTracks[j], uniqueTracks[i]];
  }

  let finalTracks = uniqueTracks.slice(0, rounds);

  if (injectedTrack) {
    // Replace the first track with the injected track if it's not already in the list
    if (!finalTracks.some(t => t.id === injectedTrack!.id)) {
      finalTracks[0] = injectedTrack;
    }
    // Shuffle again to make sure it's not always first
    for (let i = finalTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalTracks[i], finalTracks[j]] = [finalTracks[j], finalTracks[i]];
    }
  }

  return finalTracks;
}
