import test from 'node:test';
import assert from 'node:assert/strict';
import {completedVideoUrl} from './result';
test('requires a completed status and HTTPS video URL',()=>{
  assert.equal(completedVideoUrl({status:'completed',video:{url:'https://example.com/video.mp4'}}),'https://example.com/video.mp4');
  for(const status of ['failed','canceled','cancelled','nsfw','moderated','blocked','queued','in_progress']) assert.throws(()=>completedVideoUrl({status,video:{url:'https://example.com/video.mp4'}}));
  assert.throws(()=>completedVideoUrl({status:'completed'}));
  assert.throws(()=>completedVideoUrl({status:'completed',video:{url:'http://example.com/video.mp4'}}));
});
