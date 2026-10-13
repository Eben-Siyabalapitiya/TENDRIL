# Media

| file | where it shows |
| --- | --- |
| `demo.mp4`, `poster.jpg` | the video at the top |
| `flat-pickup.mp4`, `poster-flat.jpg` | picking a flat object off the desk |
| `both-ways.mp4`, `poster-both.jpg` | curling left and right |
| `arm.jpg` | the printed arm, next to the diagram |
| `rings.jpg` | the rings on the string, in the build log |
| `handle.jpg` | the handle, in the build log |
| `diagram.svg` | drawn by `make_diagram.py` |

Redraw the diagram after changing the arm:

```bash
python make_diagram.py
```

Phone videos come out in a format browsers will not play, so they get converted:

```bash
ffmpeg -i IMG_XXXX.MOV -vf "scale=-2:720,fps=30" -c:v libx264 -crf 25 -pix_fmt yuv420p -movflags +faststart out.mp4
```
