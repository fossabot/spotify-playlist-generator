import Updater from "spotify-oauth-refresher";

interface Args {
  tracks: string[];
  desc?: string;
  pub?: boolean;
  onProgress?: (percent: number) => void;
  onDone?: (pl: SpotifyApi.PlaylistObjectFull) => void;
}

export const createPlaylist = (
  name: string,
  userId: string,
  { tracks, desc, pub, onProgress, onDone }: Args,
  updater: Updater
) => {
  return new Promise<string>((resolve, reject) => {
    updater
      .request<SpotifyApi.CreatePlaylistResponse>({
        method: "POST",
        url: `https://api.spotify.com/v1/users/${userId}/playlists`,
        data: {
          name,
          public: pub,
          collaborative: false,
          description: desc,
        },
        authType: "bearer",
      })
      .then(({ data }) => {
        resolve(data.id);

        const totalChunks = Math.ceil(tracks.length / 100);
        let currentChunk = 0;

        const interval: NodeJS.Timer = setInterval(() => {
          if (currentChunk > totalChunks) {
            clearInterval(interval);
            onDone && onDone(data);
            return;
          }

          const chunk = tracks.slice(currentChunk * 100, (currentChunk + 1) * 100);
          updater
            .request<SpotifyApi.AddTracksToPlaylistResponse>({
              method: "POST",
              url: `https://api.spotify.com/v1/playlists/${data.id}/tracks`,
              data: { uris: chunk },
              authType: "bearer",
            })
            .then(() => onProgress && onProgress((currentChunk / totalChunks) * 100))
            .catch((err) => reject(err.response?.data?.error?.message || err));
        }, 1000);
      })
      .catch((err) => reject(err.response?.data?.error?.message || err));
  });
};
