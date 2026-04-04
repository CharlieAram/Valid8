export type ColorTheme = "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";

export type IconType =
  | "chart"
  | "shield"
  | "zap"
  | "target"
  | "layers"
  | "globe"
  | "clock"
  | "users";

export interface LandingPageContent {
  productName: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  painPoints: Array<{ title: string; description: string }>;
  solutionIntro: string;
  features: Array<{ title: string; description: string; icon: IconType }>;
  metrics: Array<{ value: string; label: string }>;
  finalCtaHeadline: string;
  finalCtaDescription: string;
  colorTheme: ColorTheme;
}

export type PersonalizationOverrides = Partial<
  Pick<
    LandingPageContent,
    "headline" | "subheadline" | "ctaText" | "finalCtaHeadline" | "finalCtaDescription"
  >
>;

const COLOR_HEX: Record<ColorTheme, string> = {
  blue: "#3B82F6",
  violet: "#8B5CF6",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  cyan: "#06B6D4",
};

const ICON_PATHS: Record<IconType, string> = {
  chart:
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  shield:
    "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  zap: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
  target:
    "M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  layers:
    "M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3",
  globe:
    "M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.888 17.888 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  users:
    "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function iconSvg(icon: IconType, colorClass: string): string {
  return `<svg class="w-7 h-7 ${colorClass}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="${ICON_PATHS[icon]}"/></svg>`;
}

export function buildLandingPageHtml(content: LandingPageContent): string {
  const c = content.colorTheme;
  const hex = COLOR_HEX[c];
  const initial = esc(content.productName.charAt(0) || "V");
  const name = esc(content.productName);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth overscroll-none">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<meta name="description" content="${esc(content.subheadline)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='${encodeURIComponent(hex)}'/><text x='50' y='72' font-size='60' font-weight='bold' fill='white' text-anchor='middle' font-family='system-ui'>${initial}</text></svg>">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">
<script>
tailwind.config={theme:{extend:{fontFamily:{sans:['Inter','system-ui','-apple-system','sans-serif']}}}}
</script>
<style>
html,body{overscroll-behavior:none}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
@keyframes float-slow{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-14px) rotate(2deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.animate-float{animation:float 6s ease-in-out infinite}
.animate-float-slow{animation:float-slow 8s ease-in-out 1s infinite}
.shimmer{background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.04) 50%,transparent 100%);background-size:200% 100%;animation:shimmer 3s ease-in-out infinite}
.nav-dark .nav-brand{color:#fff}
.nav-dark .nav-cta{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.1)}
.nav-dark .nav-cta:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.2)}
nav:not(.nav-dark) .nav-brand{color:#0f172a}
nav:not(.nav-dark) .nav-cta{background:#0f172a;color:#fff;border-color:#0f172a}
nav:not(.nav-dark) .nav-cta:hover{background:#1e293b}
</style>
</head>
<body class="font-sans antialiased text-slate-900 bg-white">

<!-- ───── Navbar ───── -->
<nav id="navbar" class="fixed top-0 w-full z-50 transition-all duration-500 nav-dark">
<div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
  <div class="flex items-center gap-2.5">
    <div class="w-8 h-8 rounded-lg bg-${c}-500 flex items-center justify-center shadow-lg shadow-${c}-500/25">
      <span class="text-white font-extrabold text-sm">${initial}</span>
    </div>
    <span class="nav-brand font-bold text-lg tracking-tight transition-colors duration-500">${name}</span>
  </div>
  <a href="#cta" class="nav-cta hidden sm:inline-flex px-5 py-2 text-sm font-semibold rounded-full backdrop-blur transition-all duration-500 border">
    Get Early Access
  </a>
</div>
</nav>

<!-- ───── Hero ───── -->
<section class="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
<div class="absolute inset-0">
  <div class="absolute top-1/4 -left-48 w-[500px] h-[500px] bg-${c}-500/15 rounded-full blur-[100px] animate-float"></div>
  <div class="absolute bottom-1/3 -right-48 w-[400px] h-[400px] bg-${c}-600/10 rounded-full blur-[100px] animate-float-slow"></div>
  <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-[size:72px_72px]"></div>
  <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-${c}-500/30 to-transparent"></div>
</div>

<div class="relative max-w-7xl mx-auto px-6 pt-32 pb-24 grid lg:grid-cols-2 gap-16 items-center w-full">
  <div data-aos="fade-right" data-aos-duration="800">
    <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-${c}-500/10 border border-${c}-500/20 text-sm font-medium text-${c}-400 mb-8">
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-${c}-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-${c}-400"></span>
      </span>
      Now in Early Access
    </div>
    <h1 class="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-white leading-[1.08] tracking-tight mb-6">
      ${esc(content.headline)}
    </h1>
    <p class="text-lg lg:text-xl text-slate-400 leading-relaxed mb-10 max-w-xl">
      ${esc(content.subheadline)}
    </p>
    <div class="flex flex-col sm:flex-row gap-4">
      <a href="#cta" class="inline-flex items-center justify-center px-8 py-4 bg-${c}-500 hover:bg-${c}-600 text-white rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-xl hover:shadow-${c}-500/25 hover:-translate-y-0.5">
        ${esc(content.ctaText)}
        <svg class="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
      </a>
      <a href="#features" class="inline-flex items-center justify-center px-8 py-4 border border-slate-700 hover:border-slate-500 text-slate-300 rounded-xl font-semibold transition-all duration-200 hover:bg-white/[0.03]">
        See How It Works
      </a>
    </div>
  </div>

  <!-- Dashboard Mockup -->
  <div class="relative hidden lg:block" data-aos="fade-left" data-aos-duration="1000" data-aos-delay="200">
    <div class="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] p-5 shadow-2xl">
      <div class="flex items-center gap-2 mb-5">
        <div class="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
        <div class="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
        <div class="w-3 h-3 rounded-full bg-[#28CA41]"></div>
        <div class="ml-3 flex-1 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06]"></div>
      </div>
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
          <div class="text-[11px] text-slate-500 mb-1">Growth</div>
          <div class="text-lg font-bold text-white">+127%</div>
          <div class="mt-2 h-1.5 rounded-full bg-white/[0.06]"><div class="h-full w-3/4 rounded-full bg-${c}-500"></div></div>
        </div>
        <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
          <div class="text-[11px] text-slate-500 mb-1">Revenue</div>
          <div class="text-lg font-bold text-white">$48.2K</div>
          <div class="mt-2 h-1.5 rounded-full bg-white/[0.06]"><div class="h-full w-2/3 rounded-full bg-emerald-500"></div></div>
        </div>
        <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
          <div class="text-[11px] text-slate-500 mb-1">Users</div>
          <div class="text-lg font-bold text-white">2,847</div>
          <div class="mt-2 h-1.5 rounded-full bg-white/[0.06]"><div class="h-full w-5/6 rounded-full bg-violet-500"></div></div>
        </div>
      </div>
      <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
        <svg viewBox="0 0 400 100" class="w-full h-24" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${hex}" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="${hex}" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <path d="M0,82 C30,78 60,68 100,56 S170,32 220,34 S290,22 340,14 L400,6 V100 H0Z" fill="url(#ag)"/>
          <path d="M0,82 C30,78 60,68 100,56 S170,32 220,34 S290,22 340,14 L400,6" fill="none" stroke="${hex}" stroke-width="2" stroke-linecap="round"/>
          <circle cx="400" cy="6" r="3.5" fill="${hex}"/><circle cx="400" cy="6" r="7" fill="${hex}" opacity="0.25"/>
        </svg>
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.015] shimmer">
          <div class="flex items-center gap-3"><div class="w-7 h-7 rounded-full bg-${c}-500/20 border border-${c}-500/10"></div><div class="h-2.5 w-24 rounded bg-white/[0.08]"></div></div>
          <div class="h-2.5 w-12 rounded bg-white/[0.05]"></div>
        </div>
        <div class="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.015]">
          <div class="flex items-center gap-3"><div class="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/10"></div><div class="h-2.5 w-20 rounded bg-white/[0.08]"></div></div>
          <div class="h-2.5 w-16 rounded bg-white/[0.05]"></div>
        </div>
        <div class="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.015]">
          <div class="flex items-center gap-3"><div class="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/10"></div><div class="h-2.5 w-28 rounded bg-white/[0.08]"></div></div>
          <div class="h-2.5 w-10 rounded bg-white/[0.05]"></div>
        </div>
      </div>
    </div>
    <div class="absolute -inset-4 bg-${c}-500/[0.07] rounded-3xl blur-2xl -z-10"></div>
  </div>
</div>

</section>

<!-- ───── Pain Points ───── -->
<section class="py-24 bg-white">
<div class="max-w-7xl mx-auto px-6">
  <div class="text-center max-w-2xl mx-auto mb-16" data-aos="fade-up">
    <p class="text-sm font-semibold text-red-500 tracking-widest uppercase mb-3">The Problem</p>
    <h2 class="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Sound familiar?</h2>
  </div>
  <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
${content.painPoints
  .slice(0, 3)
  .map(
    (pp, i) => `    <div class="group relative p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300" data-aos="fade-up" data-aos-delay="${i * 100}">
      <div class="absolute top-0 left-8 w-12 h-1 rounded-b bg-gradient-to-r from-red-400 to-orange-400"></div>
      <span class="inline-block text-xs font-bold text-slate-300 tracking-widest mb-5">0${i + 1}</span>
      <h3 class="text-xl font-bold text-slate-900 mb-3">${esc(pp.title)}</h3>
      <p class="text-slate-500 leading-relaxed">${esc(pp.description)}</p>
    </div>`,
  )
  .join("\n")}
  </div>
</div>
</section>

<!-- ───── Features ───── -->
<section id="features" class="py-24 bg-slate-50/80">
<div class="max-w-7xl mx-auto px-6">
  <div class="text-center max-w-2xl mx-auto mb-16" data-aos="fade-up">
    <p class="text-sm font-semibold text-${c}-600 tracking-widest uppercase mb-3">The Solution</p>
    <h2 class="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">${esc(content.solutionIntro)}</h2>
  </div>
  <div class="grid md:grid-cols-3 gap-8">
${content.features
  .slice(0, 3)
  .map(
    (f, i) => `    <div class="group bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-${c}-500/[0.05] hover:-translate-y-1 transition-all duration-300" data-aos="fade-up" data-aos-delay="${i * 100}">
      <div class="w-14 h-14 rounded-2xl bg-${c}-50 group-hover:bg-${c}-100 flex items-center justify-center mb-6 transition-colors duration-300">
        ${iconSvg(f.icon, `text-${c}-600`)}
      </div>
      <h3 class="text-xl font-bold text-slate-900 mb-3">${esc(f.title)}</h3>
      <p class="text-slate-500 leading-relaxed">${esc(f.description)}</p>
    </div>`,
  )
  .join("\n")}
  </div>
</div>
</section>

<!-- ───── Metrics ───── -->
<section class="py-24 bg-white">
<div class="max-w-5xl mx-auto px-6">
  <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
${content.metrics
  .slice(0, 3)
  .map(
    (m, i) => `    <div class="text-center py-10 md:py-0 md:px-10" data-aos="fade-up" data-aos-delay="${i * 150}">
      <div class="text-5xl lg:text-6xl font-extrabold text-${c}-600 tracking-tight mb-3">${esc(m.value)}</div>
      <div class="text-slate-500 text-lg">${esc(m.label)}</div>
    </div>`,
  )
  .join("\n")}
  </div>
</div>
</section>

<!-- ───── CTA ───── -->
<section id="cta" class="py-24 lg:py-32 bg-slate-50">
<div class="max-w-2xl mx-auto px-6 text-center">
  <h2 class="text-3xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-5" data-aos="fade-up">
    ${esc(content.finalCtaHeadline)}
  </h2>
  <p class="text-lg text-slate-500 mb-10 leading-relaxed" data-aos="fade-up" data-aos-delay="100">
    ${esc(content.finalCtaDescription)}
  </p>
  <form action="#" method="POST" class="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" data-aos="fade-up" data-aos-delay="200">
    <input type="email" name="email" placeholder="Enter your work email" required
      class="flex-1 min-w-0 px-5 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-${c}-500 focus:border-transparent shadow-sm text-base">
    <button type="submit"
      class="px-8 py-4 bg-${c}-600 hover:bg-${c}-700 text-white rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-${c}-500/25 whitespace-nowrap text-base">
      ${esc(content.ctaText)}
    </button>
  </form>
  <p class="mt-5 text-sm text-slate-400" data-aos="fade-up" data-aos-delay="300">Free to start &middot; No credit card required &middot; Setup in 2 minutes</p>
</div>
</section>

<!-- ───── Footer ───── -->
<footer class="py-12 bg-slate-900">
<div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
  <div class="flex items-center gap-2.5">
    <div class="w-7 h-7 rounded-md bg-${c}-500/80 flex items-center justify-center">
      <span class="text-white font-bold text-xs">${initial}</span>
    </div>
    <span class="text-slate-500 font-medium text-sm">${name}</span>
  </div>
  <p class="text-slate-600 text-sm">&copy; ${year} ${name}. All rights reserved.</p>
</div>
</footer>

<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
<script>
AOS.init({once:true,duration:600,easing:'ease-out-cubic',offset:50});
var nb=document.getElementById('navbar');
function ns(){if(window.scrollY>20){nb.classList.add('bg-white/80','backdrop-blur-xl','shadow-sm','border-b','border-slate-200/60');nb.classList.remove('nav-dark')}else{nb.classList.remove('bg-white/80','backdrop-blur-xl','shadow-sm','border-b','border-slate-200/60');nb.classList.add('nav-dark')}}
window.addEventListener('scroll',ns,{passive:true});ns();
</script>
</body>
</html>`;
}

export function buildPersonalizedHtml(
  base: LandingPageContent,
  overrides: PersonalizationOverrides,
): string {
  return buildLandingPageHtml({ ...base, ...overrides });
}
