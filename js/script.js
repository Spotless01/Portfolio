// Emmanuel — interactive frontpage enhancements
(function(){
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loader = document.getElementById("loader");
  const main = document.querySelector(".main-stage");
  const typedNameEl = document.getElementById("typed-name");
  const typeCursor = document.getElementById("type-cursor");
  const enterBtn = document.getElementById("enter-btn");
  const diveBtn = document.getElementById("dive-btn");
  const contactCopy = document.getElementById("contact-copy");
  const srAnnouncer = document.getElementById("sr-announcer");
  const themeToggle = document.getElementById("theme-toggle");

  // Accessible announce
  function announce(msg){
    if(srAnnouncer) srAnnouncer.textContent = msg;
  }

  // THEME: persist in localStorage
  const themeKey = "Emmanuel Sennie Mieza:theme";
  (function initTheme(){
    const saved = localStorage.getItem(themeKey);
    const root = document.documentElement;
    if(saved) root.setAttribute("data-theme", saved);
    themeToggle?.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem(themeKey, next);
      themeToggle.setAttribute("aria-pressed", String(next === "light"));
      announce(`Theme set to ${next}`);
    });
  })();

  // Typing effect (multiple titles)
  const names = ["Emmanuel Sennie Mieza", "a System Designer", "a Web Developer"];
  let nameIndex = 0;

  function typeText(el, text, speed = 90){
    return new Promise(resolve => {
      if(prefersReducedMotion){
        el.textContent = text;
        resolve();
        return;
      }
      el.textContent = "";
      let i = 0;
      const t = setInterval(()=>{
        el.textContent += text[i] || "";
        i++;
        if(i >= text.length){
          clearInterval(t);
          resolve();
        }
      }, speed);
    });
  }

  // Cycle through titles once during initial reveal
  async function playIntro(){
    if(prefersReducedMotion){
      typedNameEl.textContent = names[0];
      enterBtn.classList.remove("hidden");
      return;
    }
    for(let i=0;i<names.length;i++){
      await typeText(typedNameEl, names[i], 70);
      await new Promise(r => setTimeout(r, 600));
      if(i < names.length - 1){
        // erase
        for(let k = names[i].length; k >= 0; k--){
          typedNameEl.textContent = names[i].slice(0,k);
          await new Promise(r => setTimeout(r, 24));
        }
      }
    }
    enterBtn.classList.remove("hidden");
  }

  // Load sequence
  window.addEventListener("load", async ()=>{
    // small artificial minimum loader time
    await new Promise(r=>setTimeout(r, 700));
    loader.style.opacity = "0";
    setTimeout(()=>{ loader.style.display = "none"; main.classList.remove("hidden"); announce("Welcome to Emmanuel Sennie Mieza"); }, 520);

    // start intro typing after content is visible
    setTimeout(playIntro, 600);
  });

  // ENTER button reveals identity and shows dive CTA
  enterBtn?.addEventListener("click", (e)=>{
    const identity = document.querySelector(".identity");
    if(identity) identity.classList.add("in-view");
    enterBtn.classList.add("hidden");
    announce("Identity revealed");
    setTimeout(()=>{ diveBtn?.classList && diveBtn.classList.remove("hidden"); }, 700);
  });

  // DIVE button reveals projects & footer
  diveBtn?.addEventListener("click", ()=>{
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in-view"));
    if(diveBtn) diveBtn.remove();
    announce("Rooms revealed");
  });

  // email contact
  contactCopy?.addEventListener("click", async ()=>{
    const email = "emmanuelmieza01@gmail.com";
    try{
      await navigator.clipboard.writeText(email);
      announce("Contact copied to clipboard");
      contactCopy.textContent = "Copied ✓";
      setTimeout(()=>contactCopy.textContent = "Copy contact", 1800);
    }catch(e){
      announce("Unable to copy contact");
    }
  });

  // Intersection observer for reveal animations
  if(!prefersReducedMotion && "IntersectionObserver" in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(ent=>{
        if(ent.isIntersecting) ent.target.classList.add("in-view");
      });
    }, {threshold: 0.16});
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
  }else{
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in-view"));
  }

  // PROJECT CARD interactions: open digital-room, keyboard support, prefetch iframe on hover/focus
  function openRoom(roomId){
    const room = document.getElementById(roomId);
    if(!room) return;
    const iframe = room.querySelector(".project-frame");
    if(iframe && iframe.dataset.src && !iframe.src){
      iframe.src = iframe.dataset.src; // lazy-load initial
    }
    room.classList.remove("hidden");
    room.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    announce("Room opened");
    // focus inside iframe container for keyboard users
    setTimeout(()=>iframe && iframe.focus && iframe.focus(), 380);
  }

  function closeRoom(btn){
    const room = btn.closest(".digital-room");
    if(!room) return;
    room.classList.add("hidden");
    room.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    announce("Room closed");
  }

  // Hook up cards
  document.querySelectorAll(".project-card.interactive").forEach(card => {
    const src = card.dataset.src;
    const room = card.dataset.room;
    // prefetch on pointerenter or focus
    const prefetch = () => {
      const roomEl = document.getElementById(room);
      if(!roomEl) return;
      const iframe = roomEl.querySelector(".project-frame");
      if(iframe && iframe.dataset.src && !iframe.src){
        // small delay to avoid unnecessary loads
        iframe.__prefetchTimeout = setTimeout(()=> iframe.src = iframe.dataset.src, 260);
      }
    };
    const cancelPrefetch = () => {
      const roomEl = document.getElementById(room);
      if(!roomEl) return;
      const iframe = roomEl.querySelector(".project-frame");
      if(iframe && iframe.__prefetchTimeout) clearTimeout(iframe.__prefetchTimeout);
    };

    card.addEventListener("pointerenter", prefetch);
    card.addEventListener("focus", prefetch);

    card.addEventListener("pointerleave", cancelPrefetch);
    card.addEventListener("blur", cancelPrefetch);

    // open on click or keyboard (Enter / Space)
    card.addEventListener("click", ()=> openRoom(room));
    card.addEventListener("keydown", (ev)=>{
      if(ev.key === "Enter" || ev.key === " "){
        ev.preventDefault();
        openRoom(room);
      }
    });
  });

  // Exit-room buttons
  document.querySelectorAll(".exit-room").forEach(btn=>{
    btn.addEventListener("click", ()=> closeRoom(btn));
  });

  // Escape to close rooms
  document.addEventListener("keydown", (ev)=>{
    if(ev.key === "Escape"){
      const openRoomEl = document.querySelector(".digital-room:not(.hidden)");
      if(openRoomEl){
        openRoomEl.classList.add("hidden");
        openRoomEl.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        announce("Room closed");
      }
    }
  });

  // Respect reduced motion for blinking cursor
  if(prefersReducedMotion && typeCursor) typeCursor.style.display = "none";

  // Small enhancement: ensure iframes are focused for keyboard navigation when visible
  const observer = new MutationObserver((mutations)=>{
    mutations.forEach(m=>{
      if(m.type === "attributes" && m.attributeName === "class"){
        const target = m.target;
        if(target.classList && target.classList.contains("digital-room") && !target.classList.contains("hidden")){
          const iframe = target.querySelector("iframe");
          try{ iframe && iframe.contentWindow && iframe.contentWindow.focus && iframe.contentWindow.focus(); }catch(e){}
        }
      }
    });
  });
  document.querySelectorAll(".digital-room").forEach(room => observer.observe(room, {attributes:true}));

})();