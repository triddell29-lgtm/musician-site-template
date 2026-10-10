# Musician Site Template

A one-page site for a classical/acoustic musician, laid out like angelitoguitar.com. No build step: open `index.html` or serve the folder.

```
python3 -m http.server 5180
```

## Sections
Hero (interactive guitar strings) · Marquee · About + stats · Training & Honors timeline · Music player · Weddings (Ceremony / Cocktail / Reception + Why Choose) · Other Occasions (horizontal scroll) · Upcoming Performances · Lessons (pricing) · Publications · Photo gallery · Video · Testimonials · FAQ · Contact form · Footer

## Libraries (CDN, pinned)
| Library | Used for |
|---|---|
| GSAP 3.12.5 + ScrollTrigger | Preloader, hero intro, scroll reveals, parallax, pinned horizontal scroll, counters |
| Lenis 1.1.13 | Smooth scrolling |
| SplitType 0.3.4 | Word-by-word heading reveals |
| Swiper 11.1.14 | Testimonial slider |
| GLightbox 3.3.0 | Photo and video lightbox |
| Vanilla-Tilt 1.8.1 | 3D tilt on cards and the player |

Built-in effects: a canvas of guitar strings that pluck when the mouse crosses them, film grain, a custom cursor, magnetic buttons, a scroll progress bar, and a header that hides on scroll. If the visitor has turned on reduced motion, the animations are switched off.

## Customizing for the client
1. **Name**: find and replace `Elias Marlowe` (and `EM` in the preloader).
2. **Colors**: edit the `:root` variables at the top of `css/style.css`.
3. **Photos**: replace the `images.unsplash.com` URLs with the musician's own photos (e.g. `img/hero.jpg`).
4. **Audio**: set `data-src="audio/track.mp3"` on each `.track`. Without a file, the player runs in demo mode.
5. **Video**: change the `href` on `.video__feature` to their YouTube or Vimeo link.
6. **Contact form**: set the form's `action` to a Formspree or Netlify endpoint and replace the `TODO` in `js/main.js`.
7. **Content**: bio, timeline, prices, dates, testimonials and FAQ are all plain HTML in `index.html`.
