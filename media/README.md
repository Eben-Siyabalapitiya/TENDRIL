# Media

## Build page

| file | where it shows |
| --- | --- |
| `demo.mp4`, `poster.jpg` | the video at the top |
| `flat-pickup.mp4`, `poster-flat.jpg` | picking a flat object off the desk |
| `both-ways.mp4`, `poster-both.jpg` | curling left and right |
| `arm.jpg` | the printed arm, next to the diagram |
| `rings.jpg` | the rings on the string, in the build log |
| `handle.jpg` | the handle, in the build log |
| `diagram.svg` | drawn by `make_diagram.py` |
| `og.jpg` | social card |

## Iterate page

Still to shoot. Each one shows an empty slot on the page until the file lands.

| file | where it shows |
| --- | --- |
| `v2-demo.mp4`, `poster-v2.jpg` | the video at the top |
| `v2-third-axis.mp4`, `poster-v2-axis.jpg` | closing on the new axis |
| `v2-arm.jpg` | V2 printed flat, next to V1 |
| `v2-base.jpg` | the reinforced base |
| `og-iterate.jpg` | social card |

## Redrawing the diagram

```bash
python make_diagram.py
```

## Converting phone video

Phone videos come out in a format browsers will not play, so they get converted:

```bash
ffmpeg -i IMG_XXXX.MOV -vf "scale=-2:720,fps=30" -c:v libx264 -crf 30 -preset slow \
  -pix_fmt yuv420p -an -movflags +faststart out.mp4
```

Keep every clip under about 4 MB. The three Build clips came out at 15–32 MB each,
which is slow enough on a normal connection that the page gave up waiting and showed
the "missing file" slot instead of the video. Three things keep them small:

- `-an` drops the audio track. Every video on the site plays muted, so it is dead weight.
- `-crf 30` instead of 25 roughly halves the bitrate, and at 720p on a phone clip of a
  plastic arm there is nothing in the picture that shows it.
- `-t 15` trims to the first 15 seconds. Worth adding if a clip runs long; pick the
  window by eye first.

`-movflags +faststart` is not optional. It moves the index to the front of the file so
the browser can start playing before the whole thing has downloaded.

Re-encoding the existing `.mp4` files works, but going back to the original `.MOV` is
better, since compressing something that is already compressed loses a little each time.
