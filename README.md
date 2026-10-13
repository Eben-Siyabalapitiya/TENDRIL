# Tendril

A tendon-driven logarithmic spiral gripper, and the site that documents it.

Pull one string and the arm curls into a logarithmic spiral. Because that curve
is self-similar, the tip closes small and the base closes wide at the same
time, so the same arm picks up a marble or a bottle without changing anything.

This is a reproduction. The design principle comes from **SpiRobs: Logarithmic
spiral-shaped robots for versatile grasping across scales** (Wang, Freris &
Wei, *Device*, 2024). The point was to find out what the paper leaves out.

## The site

Plain HTML, CSS and a bit of JavaScript. No build step, no dependencies.

```
index.html      the page
styles.css      all the styling
script.js       scroll reveals + media placeholders
media/          video and photos (see media/README.md)
```

Run it locally with any static server:

```bash
python -m http.server 8137
```

### Phases

The project runs through Build, Iterate and Create. The nav has all three.
Build is this page and lives at `/`. The other two unlock as they happen.
Add `iterate.html` and `create.html`, then point the nav links at them and drop
`is-locked` from the pill.

## The arm itself

The printed arm is modelled in Onshape. There is also a parametric script that
generates the same shape, written first as a way to work the geometry out. It
is a test piece, not what gets printed.

Current build: printed in PLA, spiral about five inches long, 2.3 hours on the
printer, 9 g of plastic for the arm and 25 g with the handle. Controlled with
plain string pulled by hand, nothing motorised.

Built by Eben Siyabalapitiya in Toronto.
