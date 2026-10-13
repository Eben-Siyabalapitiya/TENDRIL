// Scroll reveal
const revealables = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('in'));
}

// Photo slots: show the placeholder until a real file is dropped in /media
document.querySelectorAll('.shot').forEach((figure) => {
  const img = figure.querySelector('img');
  if (!img) return;
  const markEmpty = () => figure.classList.add('is-empty');
  if (img.complete && img.naturalWidth === 0) markEmpty();
  img.addEventListener('error', markEmpty);
  img.addEventListener('load', () => {
    if (img.naturalWidth === 0) markEmpty();
  });
});

// Same for the demo video
document.querySelectorAll('[data-video]').forEach((frame) => {
  const video = frame.querySelector('video');
  if (!video) return;
  const markEmpty = () => frame.classList.add('is-empty');
  video.addEventListener('error', markEmpty, true);
  const source = video.querySelector('source');
  if (source) source.addEventListener('error', markEmpty);
  // if nothing loads within a moment, assume the file isn't there yet
  setTimeout(() => {
    if (!video.videoWidth) markEmpty();
  }, 1200);
});
