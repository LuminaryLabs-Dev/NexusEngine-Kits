// Streaming area-average downsampling for high-rate libretro PCM. Web Audio
// handles ordinary source rates; this preserves fractional windows across frames.
export function createPcmPlayback(context, { maxQueuedSeconds = 0.25 } = {}) {
  let end = 0, rate = null, fill = 0, left = 0, right = 0; const sources = new Set();
  function clearResampler() { rate=null; fill=left=right=0; }
  return {
    enqueue(bytes, sampleRate) {
      if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 8388608 || bytes.length % 4) throw new Error("Invalid PCM layout.");
      const frames=bytes.length/4;if(!frames)return;
      if(end>context.currentTime+maxQueuedSeconds){clearResampler();return;}
      const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let outputRate=sampleRate,channels;
      if(sampleRate>192000){
        outputRate=context.sampleRate??48000;if(rate!==sampleRate){clearResampler();rate=sampleRate;}
        const window=sampleRate/outputRate, a=[],b=[];
        for(let i=0;i<frames;i++){
          const l=view.getInt16(i*4,true)/32768,r=view.getInt16(i*4+2,true)/32768;let remaining=1;
          while(remaining>1e-9){const weight=Math.min(remaining,window-fill);left+=l*weight;right+=r*weight;fill+=weight;remaining-=weight;
            if(fill>=window-1e-9){a.push(left/window);b.push(right/window);fill=left=right=0;}
          }
        }
        channels=[a,b];
      }else{clearResampler();channels=[new Float32Array(frames),new Float32Array(frames)];for(let c=0;c<2;c++)for(let i=0;i<frames;i++)channels[c][i]=view.getInt16(i*4+c*2,true)/32768;}
      const count=channels[0].length;if(!count)return;const buffer=context.createBuffer(2,count,outputRate);
      for(let c=0;c<2;c++)buffer.getChannelData(c).set(channels[c]);
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);sources.add(source);source.onended=()=>sources.delete(source);
      const start=Math.max(context.currentTime+.01,end);source.start(start);end=start+count/outputRate;
    },
    reset(){for(const source of sources)source.stop();sources.clear();end=0;clearResampler();},
    dispose(){this.reset();}
  };
}
