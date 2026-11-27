"""Build two short original arrangements of credited CC0 samples, no network."""
import sys, subprocess, wave, array, tempfile
from pathlib import Path
ffmpeg=sys.argv[1]
rate=44100
def read_clip(src, work):
    dest=Path(work)/(Path(src).stem+".wav")
    subprocess.run([ffmpeg,"-v","error","-y","-i",src,"-ar",str(rate),"-ac","2","-c:a","pcm_s16le",str(dest)],check=True)
    with wave.open(str(dest),"rb") as w:
        a=array.array("h",w.readframes(w.getnframes()))
    if sys.byteorder!="little": a.byteswap()
    return a
def mix(name,duration,layers,work):
    data=[0.0]*(round(duration*rate)*2)
    for src,offset,gain,limit in layers:
        samples=read_clip(src,work)
        start=round(offset*rate)*2
        length=min(len(samples),len(data)-start,round(limit*rate)*2)
        for i in range(length):
            edge=min(1,i/(.008*rate*2),max(0,(length-i)/(.08*rate*2)))
            data[start+i]+=samples[i]*gain*edge
    peak=max(abs(v) for v in data)
    if peak<100: raise ValueError("silent mix")
    gain=27000/peak
    fade=round(.3*rate)*2
    result=array.array("h",(round(max(-32767,min(32767,v*gain*min(1,(len(data)-i)/fade)))) for i,v in enumerate(data)))
    if sys.byteorder!="little": result.byteswap()
    path=Path(work)/(name+"-mix.wav")
    with wave.open(str(path),"wb") as out:
        out.setnchannels(2);out.setsampwidth(2);out.setframerate(rate);out.writeframes(result.tobytes())
    subprocess.run([ffmpeg,"-v","error","-y","-i",str(path),"-af","loudnorm=I=-15:TP=-2:LRA=7","-ar",str(rate),"-ac","2","-codec:a","libmp3lame","-b:a","112k",f"public/audio/codenames/{name}.mp3"],check=True)
with tempfile.TemporaryDirectory() as work:
    mix("opening",2.4,[("audio-mix/riser.ogg",0,.45,1.5),("audio-source/opening.ogg",.9,.85,.8),("audio-source/victoryMusic.ogg",1.1,.85,1.3),("audio-source/victory.ogg",1.05,.24,1.0)],work)
    mix("victoryMusic",2.6,[("audio-source/opening.ogg",0,.8,.8),("audio-source/victoryMusic.ogg",.18,.9,1.3),("audio-source/correct.wav",1.25,.65,1.3)],work)
