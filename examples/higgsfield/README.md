# Higgsfield Seedance 2.5 example

Requires Node 22 and npm, matching this project. Run from the repository root.

1. Enter `HF_CREDENTIALS=key-id:key-secret` locally in `.env.local`. Do not put the value into chat, code, logs, or a `NEXT_PUBLIC_` variable. `.env.local` is ignored by Git.
2. Run `npm run higgsfield:test` for non-billable result-validation tests.
3. Run `npm run higgsfield:example` to submit ONE BILLABLE generation and wait for completion. The example uses the official SDK `subscribe` method, Seedance 2.5, prompt `A cinematic scene at sunset`, 5 seconds, 720p, 16:9, MP4, and audio enabled (the documented default).

Only a completed response with an HTTPS `video.url` is printed to stdout. Failure, cancellation, moderation, missing credentials, and missing output fail with a nonzero exit code. Raw SDK errors and HTTP objects are never printed. Submission retries are disabled. The installed SDK does not treat cancellation as a terminal polling status, so canceled jobs may reach the polling timeout; the example does not report these as success. After timeout/network failure, check the provider dashboard before retrying to avoid paying twice.

This example stays outside the Next.js browser bundle. `dotenv` loads `.env.local` at runtime without printing values. No API endpoint or public credential field is added.

Official references read before implementation:
- https://docs.higgsfield.ai/docs/how-to/sdk
- https://console.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference

Setup alone is not verification of a successful generation. A real completed request and video URL are required.
