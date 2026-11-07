# Approved public Live Signal gates - November 7, 2026

**Owner authorization:** publish Spotify **metadata** (track title, artist, album artwork and Spotify link, not audio), verified approved-project development status, and the individually selected seven-day GPT usage snapshot. Spotify playback alone cannot imply coding. Never publish family/client/private repositories, prompts, paths, task descriptions, account IDs or credentials.

## Release plan

1. Verify exact source, CI and active Worker configuration. Public publishing is separate from the main PRESENCE_ENABLED feature flag.
2. The runtime's existing owner-approved PRESENCE_PUBLIC_RELEASE_APPROVED, LISTENING_PUBLIC_RELEASE_APPROVED and GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED flags are preserved during subsequent releases. Each must be an explicit boolean string; missing flags remain false. The legacy GPT_USAGE_READ_ENABLED and GPT_USAGE_WRITE_ENABLED flags remain false.
3. Select only the DevonAkins.com public project initially. Keep global private-work override off; enable owner-approved public presence and the existing GitHub Actions reporter only for its fixed project. Separately enable Spotify playback metadata and the previously owner-recorded profile_7d_tokens metric.
4. Verify anonymous, no-credential responses at /api/activity/v4, /api/listening/now and /api/presence/public. When playing, Spotify may return track metadata and cover art; paused/private playback returns hidden or off-air. GPT displays owner-captured tokens with actual capture time and source, never a synthetic live counter.
5. The owner's Stop all broadcasting overrides every public signal. Editor and Work/Codex integrations are not complete until real runner pairing is verified.

## Limitations

The public GPT snapshot is a dated owner-recorded observation. Refreshing the webpage does not automatically collect another personal ChatGPT statistic. Spotify shares playback metadata, not audio. GitHub Actions reports jobs, not arbitrary ChatGPT Work tasks. The local VS Code companion requires installation and authorized real-world pairing.

## Rollback

Disable runtime release flags and stop broadcasting; revoke the individual source or metric as necessary. Preserve Spotify credentials and the owner private database. Do not restore D1 or delete records merely to stop publication.
