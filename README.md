# Tendril

A printed arm that curls up when you pull a string, and the site that shows it off.

The segments get smaller as they go, so when it closes, the tip makes a tight
little loop while the base makes a wide one. That means the same arm can hold
something small like a screw or something fat like a roll of tape, without
anything being adjusted in between.

There are no motors and no electronics. One string runs through the inside of
the arm, and pulling it closes every joint at once. There is a ring tied to each
end of the string, one for closing and one for opening, so it can be worked by
hand.

The shape is not something I came up with. It is a rebuild of a design that
already existed, done to find out what actually goes into making one.

## The build

Printed in PLA, in one piece, flat on the bed. It bends at the thin parts
between the segments, and those same thin parts spring it back open when the
string is let go.

The first print snapped at the bottom after a few pulls, because the lowest
joint carries the whole arm and it had a sharp corner in it. Rounding out the
bottom of every gap fixed it, and the second print has held up since.

There is also a handle the arm mounts onto, so you are holding that instead of
squeezing the arm itself while you pull.

It only curls in one plane right now. Left and right work, up and down does not,
and that is the next thing to solve.

## The site

Plain HTML, CSS and a bit of JavaScript. No build step and nothing to install.

```
index.html      the page
styles.css      all the styling
script.js       scroll animations and video handling
media/          videos, photos and the diagram
```

Run it locally with any static server:

```bash
python -m http.server 8137
```

The diagram is drawn by a small script in `media`, so the shape can be redrawn
if the arm changes. Videos came off an iPhone and were converted so browsers
can play them. Details for both are in `media/README.md`.

### Phases

The project runs through Build, Iterate and Create, and the nav has all three.
Build is this page and lives at the root. The other two unlock as they happen.
Add `iterate.html` and `create.html`, point the nav links at them, and drop the
locked class from the pill.

## Credits

Built by Eben Siyabalapitiya. Design, modelling, printing, photos, video and the
site are all mine.
