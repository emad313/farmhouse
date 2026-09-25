import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown,
  ArrowUpRight,
  CircleDot,
  Leaf,
  Menu,
  Milk,
  Sprout,
  Waves,
  Wheat,
  X,
} from 'lucide-react';
import './index.css';

type Segment = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  stat?: string;
  statLabel?: string;
  image?: string;
  accent: string;
};

const segments: Segment[] = [
  {
    id: 'land',
    kicker: '01 / THE LAND',
    title: 'Grown close to the land.',
    body: 'A living farm shaped by Bangladesh, where green fields, water, animals and home exist as one ecosystem.',
    stat: '100%',
    statLabel: 'close to nature',
    accent: 'rgba(24, 61, 37, 0.3)',
  },
  {
    id: 'home',
    kicker: '02 / THE FARMHOUSE',
    title: 'A home rooted in nature.',
    body: 'Modern comfort meets familiar rural textures, open air, warm materials and a slower way of living.',
    accent: 'rgba(71, 56, 34, 0.3)',
  },
  {
    id: 'cows',
    kicker: '03 / DAIRY',
    title: 'Raised naturally.',
    body: 'Healthy cattle, open spaces and a careful rhythm of feeding, resting and tending.',
    stat: '24/7',
    statLabel: 'care & attention',
    image: '/assets/cow.png',
    accent: 'rgba(49, 80, 43, 0.35)',
  },
  {
    id: 'dairy',
    kicker: '04 / FROM THE FARM',
    title: 'Pure by process.',
    body: 'Freshness starts with the way the farm is cared for, long before anything reaches the table.',
    stat: 'LOCAL',
    statLabel: 'grown & produced',
    accent: 'rgba(49, 84, 60, 0.3)',
  },
  {
    id: 'chicken',
    kicker: '05 / FREE RANGE',
    title: 'Room to roam.',
    body: 'Free-range chickens move through open, green spaces as part of the farm’s natural cycle.',
    image: '/assets/chickens.png',
    accent: 'rgba(78, 92, 45, 0.3)',
  },
  {
    id: 'goat',
    kicker: '06 / PASTURE',
    title: 'Life in motion.',
    body: 'Goats, grass, shade and fresh air come together in a simple, natural environment.',
    image: '/assets/goat.png',
    accent: 'rgba(61, 77, 37, 0.3)',
  },
  {
    id: 'fields',
    kicker: '07 / ORGANIC CULTIVATION',
    title: 'From soil to table.',
    body: 'Seasonal vegetables grow in rich soil, surrounded by water, trees and the everyday life of the farm.',
    image: '/assets/vegetable.png',
    accent: 'rgba(36, 84, 47, 0.4)',
  },
  {
    id: 'pond',
    kicker: '08 / WATER',
    title: 'Every ecosystem needs water.',
    body: 'A quiet pond gathers the landscape together and gives the farm another layer of life.',
    image: '/assets/pond.jpg',
    accent: 'rgba(21, 62, 69, 0.4)',
  },
  {
    id: 'garden',
    kicker: '09 / THE GARDEN',
    title: 'A softer kind of abundance.',
    body: 'Fruit trees, flowers, herbs and vegetables turn the spaces between buildings into living gardens.',
    accent: 'rgba(45, 84, 44, 0.35)',
  },
  {
    id: 'ecosystem',
    kicker: '10 / THE WHOLE FARM',
    title: 'One farm. Many forms of life.',
    body: 'Home, livestock, crops and water working together as one connected landscape.',
    stat: '01',
    statLabel: 'living ecosystem',
    accent: 'rgba(23, 60, 37, 0.45)',
  },
];

const videos = segments.map(
  (_, i) => `/assets/segment-${String(i + 1).padStart(2, '0')}.mp4`
);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function App() {
  const vids = useRef<(HTMLVideoElement | null)[]>([]);

  // Tall scroll track; the sticky stage inside it holds the videos.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const progressBar = useRef<HTMLDivElement | null>(null);

  // Where the user's scroll wants the video to be (0 → 1).
  const targetProgress = useRef(0);

  // Where the video currently is (eased toward target).
  const currentProgress = useRef(0);

  // Current segment without forcing React state on every frame.
  const activeRef = useRef(0);

  const [active, setActive] = useState(0);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let frame: number | null = null;
    let lastTime = 0;

    /*
     * Convert the track's position into a normalized 0 → 1 value.
     * Measured from the element itself, so mobile URL-bar resizes
     * never need a React re-render or a height recalculation.
     */
    const updateScrollTarget = () => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);

      targetProgress.current = clamp(-rect.top / range, 0, 0.999999);
    };

    /*
     * Preload the current segment and its neighbours so the
     * crossfade in either scroll direction has frames ready.
     */
    const prepareVideo = (index: number) => {
      const video = vids.current[index];
      if (!video || video.preload === 'auto') return;

      video.preload = 'auto';
      video.load();
    };

    const prepareAround = (index: number) => {
      for (let i = index - 1; i <= index + 1; i++) {
        if (i >= 0 && i < segments.length) prepareVideo(i);
      }
    };

    /*
     * Seek a video to a local 0 → 1 position.
     *
     * The clips are encoded all-intra (every frame is a keyframe),
     * so a seek is a single-frame decode. We still never stack a
     * new seek on top of one that is in flight.
     */
    const seek = (video: HTMLVideoElement, local: number) => {
      if (video.readyState < 1 || !(video.duration > 0) || video.seeking) {
        return;
      }

      // Don't seek to the absolute final frame (browser edge cases).
      const time = local * Math.max(0, video.duration - 0.05);

      if (Math.abs(video.currentTime - time) > 0.02) {
        video.currentTime = time;
      }
    };

    /*
     * MAIN SMOOTH VIDEO LOOP
     *
     * scroll → targetProgress → eased currentProgress → video.currentTime
     *
     * The loop only runs while there is distance left to cover, and
     * easing is time-based so it feels the same at 60Hz and 120Hz.
     */
    const render = (now: number) => {
      const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;

      const difference = targetProgress.current - currentProgress.current;

      if (Math.abs(difference) < 0.00005) {
        currentProgress.current = targetProgress.current;
      } else {
        currentProgress.current += difference * (1 - Math.exp(-dt * 9));
      }

      const scaled = currentProgress.current * segments.length;
      const segmentIndex = Math.min(segments.length - 1, Math.floor(scaled));
      const local = clamp(scaled - segmentIndex, 0, 0.999999);

      if (segmentIndex !== activeRef.current) {
        activeRef.current = segmentIndex;
        setActive(segmentIndex);
        prepareAround(segmentIndex);
      }

      const video = vids.current[segmentIndex];
      if (video) seek(video, local);

      if (progressBar.current) {
        progressBar.current.style.transform = `scaleX(${currentProgress.current})`;
      }

      // Keep running until settled and the final seek has landed.
      if (
        currentProgress.current !== targetProgress.current ||
        (video && video.seeking)
      ) {
        frame = requestAnimationFrame(render);
      } else {
        frame = null;
        lastTime = 0;
      }
    };

    const wake = () => {
      if (frame === null) frame = requestAnimationFrame(render);
    };

    const handleScroll = () => {
      updateScrollTarget();
      wake();
    };

    // A late-loading video needs one more pass to show its frame.
    const handleLoaded = () => wake();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    vids.current.forEach((video) =>
      video?.addEventListener('loadeddata', handleLoaded)
    );

    updateScrollTarget();
    currentProgress.current = targetProgress.current;
    prepareAround(0);
    wake();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      vids.current.forEach((video) =>
        video?.removeEventListener('loadeddata', handleLoaded)
      );
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  /*
   * Navigation jump.
   */
  const jump = (index: number) => {
    const track = trackRef.current;
    if (!track) return;

    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const segmentHeight =
      (track.offsetHeight - window.innerHeight) / segments.length;

    window.scrollTo({
      top: trackTop + (index + 0.1) * segmentHeight,
      behavior: 'smooth',
    });

    setMenu(false);
  };

  const segment = segments[active];

  return (
    <>
      <div
        ref={trackRef}
        style={{ height: `${(segments.length + 1) * 100}vh` }}
        className="relative bg-[#0a120d]"
      >
        <div className="stage sticky top-0 overflow-hidden bg-black">

          {/* =========================
              BACKGROUND VIDEOS
          ========================== */}

          {videos.map((src, index) => (
            <video
              key={src}
              ref={(element) => {
                vids.current[index] = element;
              }}
              src={src}
              muted
              playsInline
              disablePictureInPicture
              preload={index < 2 ? 'auto' : 'metadata'}
              className={`
                absolute inset-0
                h-full w-full
                object-cover
                transition-opacity
                duration-500
                ${
                  active === index
                    ? 'opacity-100'
                    : 'opacity-0'
                }
              `}
            />
          ))}

          {/* =========================
              VIDEO OVERLAY
          ========================== */}

          {/* Gradients can't transition, so each accent is its own layer that fades. */}
          {segments.map((item, index) => (
            <div
              key={item.id}
              style={{
                backgroundImage: `linear-gradient(to bottom, ${item.accent}, transparent)`,
              }}
              className={`
                absolute inset-0
                pointer-events-none
                transition-opacity
                duration-700
                ${active === index ? 'opacity-100' : 'opacity-0'}
              `}
            />
          ))}

          <div className="video-vignette absolute inset-0 pointer-events-none" />

          {/* =========================
              HEADER
          ========================== */}

          <header className="absolute top-0 left-0 right-0 z-50 px-5 py-5 sm:px-8 lg:px-10">
            <div className="flex items-center justify-between">

              <button
                onClick={() => jump(0)}
                className="flex items-center gap-3"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl">
                  <Leaf size={19} />
                </span>

                <span className="text-[22px] font-medium tracking-[-.04em]">
                  Farmhouse
                </span>
              </button>

              <nav className="hidden lg:flex items-center gap-1 rounded-full glass px-2 py-2">
                {segments.slice(0, 5).map(
                  (item, index) => (
                    <button
                      key={item.id}
                      onClick={() => jump(index)}
                      className={`
                        rounded-full
                        px-4 py-2
                        text-xs
                        ${
                          active === index
                            ? 'bg-white text-[#122017]'
                            : 'text-white/75 hover:bg-white/10'
                        }
                      `}
                    >
                      {item.kicker.split(' / ')[1]}
                    </button>
                  )
                )}
              </nav>

              <div className="flex items-center gap-2">

                <button className="hidden sm:flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#122017]">
                  Visit the farm
                  <ArrowUpRight size={15} />
                </button>

                <button
                  onClick={() => setMenu(true)}
                  className="grid h-11 w-11 place-items-center rounded-full glass lg:hidden"
                >
                  <Menu size={20} />
                </button>

              </div>
            </div>
          </header>

          {/* =========================
              CONTENT
          ========================== */}

          <main className="absolute inset-0 z-30">

            <div className="absolute left-5 right-5 top-[22%] sm:left-10 lg:left-[10vw] lg:top-[24%]">
              <div key={segment.id} className="segment-in max-w-5xl">

                <div className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[.28em] text-white/65 sm:text-xs">
                  <span className="h-px w-8 bg-white/50" />
                  {segment.kicker}
                </div>

                <h1
                  className="text-shadow max-w-5xl text-[15vw] font-medium leading-[.83] tracking-[-.075em] text-white sm:text-[10vw] lg:text-[8.2vw]"
                >
                  {segment.title}
                </h1>

                <div className="mt-7 flex max-w-xl flex-col gap-5 sm:mt-9 sm:flex-row sm:items-end">

                  <p className="max-w-md text-sm leading-6 text-white/75 sm:text-base">
                    {segment.body}
                  </p>

                  {segment.stat && (
                    <div className="glass shrink-0 rounded-2xl px-5 py-4">
                      <div className="text-3xl font-medium tracking-[-.06em]">
                        {segment.stat}
                      </div>

                      <div className="mt-1 text-[9px] uppercase tracking-[.2em] text-white/55">
                        {segment.statLabel}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* IMAGE */}
            {segment.image && (
              <img
                key={segment.image}
                src={segment.image}
                alt=""
                className="pointer-events-none absolute bottom-[9%] right-[4%] hidden max-h-[44vh] max-w-[34vw] object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,.45)] segment-in lg:block"
              />
            )}

            {/* BOTTOM */}
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between sm:bottom-7 sm:left-8 sm:right-8 lg:bottom-9 lg:left-10 lg:right-10">

              <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[.2em] text-white/55 sm:flex">
                <CircleDot size={13} />
                Scroll to explore
              </div>

              <div className="ml-auto flex items-center gap-4">

                <div className="h-px w-20 overflow-hidden bg-white/20 sm:w-36">
                  <div
                    ref={progressBar}
                    className="h-full origin-left bg-white will-change-transform"
                    style={{ transform: 'scaleX(0)' }}
                  />
                </div>

                <span className="min-w-[52px] text-right text-xs tracking-[.18em]">
                  {String(active + 1).padStart(2, '0')} / 10
                </span>

              </div>
            </div>

            {/* SCROLL BUTTON */}
            <button
              onClick={() =>
                jump(
                  Math.min(
                    active + 1,
                    segments.length - 1
                  )
                )
              }
              className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full glass px-4 py-2 text-[10px] uppercase tracking-[.18em] md:flex"
            >
              Scroll
              <ArrowDown size={13} />
            </button>
          </main>

          {/* =========================
              MOBILE MENU
          ========================== */}

          {menu && (
            <div className="absolute inset-0 z-[100] bg-[#0a120d]/90 p-5 backdrop-blur-2xl">

              <div className="flex justify-between">

                <span className="text-[22px]">
                  Farmhouse
                </span>

                <button
                  onClick={() => setMenu(false)}
                  className="grid h-11 w-11 place-items-center rounded-full glass"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="mt-20 flex flex-col gap-4">

                {segments.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => jump(index)}
                    className="flex items-baseline justify-between border-b border-white/10 pb-4 text-left"
                  >
                    <span className="text-4xl font-medium tracking-[-.06em]">
                      {item.kicker.split(' / ')[1]}
                    </span>

                    <span className="text-xs tracking-[.2em]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </button>
                ))}

              </div>
            </div>
          )}

        </div>
      </div>

      {/* =========================
          PHILOSOPHY
      ========================== */}

      <section className="relative min-h-screen overflow-hidden bg-[#edf0e5] px-6 py-24 text-[#162119] sm:px-10 lg:px-[10vw]">

        <div className="mx-auto max-w-6xl">

          <div className="grid gap-14 lg:grid-cols-[1.1fr_.9fr] lg:items-end">

            <div>

              <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[.24em] text-[#536455]">
                <Sprout size={15} />
                Farmhouse philosophy
              </div>

              <h2 className="max-w-4xl text-[14vw] font-medium leading-[.82] tracking-[-.08em] sm:text-[9vw] lg:text-[7vw]">
                Better farming starts with paying attention.
              </h2>

            </div>

            <div className="max-w-md text-sm leading-7 text-[#536455] sm:text-base">

              We believe a farm is more than what it produces. It is soil, water, animals, people, seasons and the quiet decisions that keep them in balance.

              <button className="mt-7 flex items-center gap-2 rounded-full bg-[#162119] px-6 py-3 text-sm text-white">
                Discover our approach
                <ArrowUpRight size={16} />
              </button>

            </div>

          </div>

          <div className="mt-24 grid gap-4 sm:grid-cols-3">

            {[
              [
                Wheat,
                'Organic fields',
                'Seasonal crops grown with care.',
              ],
              [
                Milk,
                'Responsible dairy',
                'Healthy animals, thoughtful routines.',
              ],
              [
                Waves,
                'Living water',
                'Ponds and irrigation woven into the land.',
              ],
            ].map(([Icon, title, body], index) => {

              const I = Icon as typeof Leaf;

              return (
                <div
                  key={index}
                  className="rounded-[28px] border border-black/10 bg-white/55 p-7"
                >

                  <I size={22} />

                  <h3 className="mt-12 text-xl font-medium">
                    {title as string}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#68756a]">
                    {body as string}
                  </p>

                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="bg-[#102016] px-6 py-10 text-white sm:px-10 lg:px-[10vw]">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Leaf size={19} />
            Farmhouse
          </div>

          <p className="text-xs text-white/45">
            Grown close to the land.
          </p>

        </div>

      </footer>
    </>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);