// Server-side CLI only. Never import this example into a browser component.
import {config as loadEnv} from 'dotenv';
import {resolve} from 'node:path';
import {config,higgsfield,AuthenticationError,CredentialsMissedError,NotEnoughCreditsError,TimeoutError} from '@higgsfield/client/v2';
import {completedVideoUrl} from './result';

async function main() {
  loadEnv({path:resolve(process.cwd(),'.env.local'),quiet:true});
  if(!process.env.HF_CREDENTIALS?.trim()) {
    console.error('Blocked: enter HF_CREDENTIALS=key-id:key-secret locally in .env.local, then run npm run higgsfield:example. Do not paste credentials into chat.');
    process.exitCode=1;return;
  }
  if(!/^[^\s:]+:[^\s:]+$/.test(process.env.HF_CREDENTIALS)) {
    console.error('Blocked: HF_CREDENTIALS must use key-id:key-secret format. Its value has not been displayed.');
    process.exitCode=1;return;
  }
  config({credentials:process.env.HF_CREDENTIALS,maxRetries:0,pollInterval:3000,maxPollTime:20*60*1000,timeout:60000});
  console.error('Submitting one billable Seedance 2.5 generation; waiting for completion.');
  let result;
  try {
    result=await higgsfield.subscribe('bytedance/seedance-2.5/text-to-video',{
      input:{prompt:'A cinematic scene at sunset',duration:5,resolution:'720p',aspect_ratio:'16:9',output_format:'mp4',generate_audio:true,draft:false},
      withPolling:true,
    });
  } catch(error) {
    // Never log SDK errors, HTTP objects, response bodies or credentials.
    const message=error instanceof AuthenticationError || error instanceof CredentialsMissedError ? 'Authentication failed. Check the credentials locally.'
      :error instanceof NotEnoughCreditsError ? 'Blocked: the Higgsfield account has insufficient credits.'
      :error instanceof TimeoutError ? 'Polling timed out. Check the dashboard for completion or cancellation before retrying; a request may already have been billed.'
      :'The SDK request did not complete successfully. Check the dashboard for a failed, canceled or moderated request before retrying.';
    console.error(message);process.exitCode=1;return;
  }
  try {console.log(completedVideoUrl(result));}
  catch(error){console.error(error instanceof Error ? error.message:'No verified completed video URL was returned.');process.exitCode=1;}
}
void main().catch(()=>{console.error('Example stopped unexpectedly; no success has been verified.');process.exitCode=1;});
