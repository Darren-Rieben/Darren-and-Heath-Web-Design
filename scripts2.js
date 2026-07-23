(() => {
  "use strict";

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  function initTypedHeadings(prefersReducedMotion) {
    const typedHeadings = document.querySelectorAll(".typed-title");
    const animatedTitles = new WeakSet();

    function showFullTitle(titleElement) {
      const textTarget = titleElement.querySelector(".typed-content");
      const text = titleElement.dataset.text || textTarget?.textContent || "";

      if (textTarget) {
        textTarget.textContent = text;
      }

      titleElement.classList.add("is-complete");
    }

    function animateTypedTitle(titleElement, speed = 52) {
      const textTarget = titleElement.querySelector(".typed-content");
      const text = titleElement.dataset.text || textTarget?.textContent || "";

      if (!textTarget || !text) {
        return;
      }

      if (prefersReducedMotion) {
        showFullTitle(titleElement);
        return;
      }

      textTarget.textContent = "";
      titleElement.classList.remove("is-complete");
      let index = 0;

      function typeNextCharacter() {
        index += 1;
        textTarget.textContent = text.slice(0, index);

        if (index < text.length) {
          window.setTimeout(typeNextCharacter, speed);
        } else {
          titleElement.classList.add("is-complete");
        }
      }

      window.setTimeout(typeNextCharacter, 160);
    }

    function runTitleOnce(titleElement, speed = 52) {
      if (animatedTitles.has(titleElement)) {
        return;
      }

      animatedTitles.add(titleElement);
      animateTypedTitle(titleElement, speed);
    }

    typedHeadings.forEach((titleElement) => {
      if (!titleElement.hasAttribute("data-animate-on-view")) {
        runTitleOnce(titleElement, 48);
      }
    });

    const viewTriggeredTitles = document.querySelectorAll(
      ".typed-title[data-animate-on-view='true']"
    );

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      viewTriggeredTitles.forEach((titleElement) => runTitleOnce(titleElement));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, titleObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runTitleOnce(entry.target);
            titleObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.28,
        rootMargin: "0px 0px -12% 0px"
      }
    );

    viewTriggeredTitles.forEach((titleElement) => observer.observe(titleElement));
  }

  function initRevealAnimations(prefersReducedMotion) {
    const revealItems = [...document.querySelectorAll("[data-reveal]")];

    revealItems.forEach((item) => {
      const customDelay = Number.parseInt(item.dataset.revealDelay || "", 10);
      const group = item.closest(".portfolio-grid, .testimonial-grid, .about-people");
      const groupIndex = group ? [...group.querySelectorAll("[data-reveal]")].indexOf(item) : 0;
      const delay = Number.isFinite(customDelay) ? customDelay : Math.min(groupIndex * 90, 270);
      item.style.transitionDelay = `${delay}ms`;
    });

    document.body.classList.add("reveal-ready");

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.13,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  function initStarfield(prefersReducedMotion) {
    const canvas = document.getElementById("starfield");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    const pointer = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      targetX: 0,
      targetY: 0,
      smoothX: 0,
      smoothY: 0,
      active: false
    };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let animationFrame = 0;
    let lastTime = performance.now();
    let scrollTarget = window.scrollY;
    let scrollSmooth = window.scrollY;

    function createStar(index, count) {
      const depth = Math.random();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        radius: 0.35 + depth * 1.35,
        alpha: 0.16 + depth * 0.64,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.00035 + Math.random() * 0.0007,
        drift: 0.012 + depth * 0.035,
        offset: index / Math.max(count, 1)
      };
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.min(320, Math.max(120, Math.round((width * height) / 6800)));
      stars = Array.from({ length: targetCount }, (_, index) => createStar(index, targetCount));
    }

    function draw(time) {
      const delta = Math.min(time - lastTime, 40);
      lastTime = time;
      pointer.smoothX += (pointer.targetX - pointer.smoothX) * 0.055;
      pointer.smoothY += (pointer.targetY - pointer.smoothY) * 0.055;
      scrollSmooth += (scrollTarget - scrollSmooth) * 0.045;

      context.clearRect(0, 0, width, height);

      for (const star of stars) {
        star.y += star.drift * delta;
        if (star.y > height + 8) {
          star.y = -8;
          star.x = Math.random() * width;
        }

        const layerStrength = 0.25 + star.depth * 1.15;
        let drawX = star.x + pointer.smoothX * layerStrength * 22;
        let drawY = star.y + pointer.smoothY * layerStrength * 16 - scrollSmooth * 0.018 * layerStrength;

        if (drawY < -12) {
          drawY = ((drawY % (height + 24)) + height + 24) % (height + 24) - 12;
        }

        const distanceX = pointer.x - drawX;
        const distanceY = pointer.y - drawY;
        const distance = Math.hypot(distanceX, distanceY);
        const magneticRadius = 210;
        let magneticGlow = 0;

        if (pointer.active && distance < magneticRadius && distance > 0.01) {
          const influence = Math.pow(1 - distance / magneticRadius, 2) * (0.22 + star.depth * 0.78);
          drawX += distanceX * influence * 0.1;
          drawY += distanceY * influence * 0.1;
          magneticGlow = influence * 0.9;
        }

        const twinkle = prefersReducedMotion
          ? 0.8
          : 0.72 + Math.sin(time * star.twinkleSpeed + star.phase) * 0.28;
        const alpha = Math.min(1, star.alpha * twinkle + magneticGlow);
        const radius = star.radius + magneticGlow * 1.4;

        context.beginPath();
        context.fillStyle = `rgba(225, 236, 252, ${alpha})`;
        context.arc(drawX, drawY, radius, 0, Math.PI * 2);
        context.fill();

        if (magneticGlow > 0.1) {
          context.beginPath();
          context.fillStyle = `rgba(188, 215, 250, ${magneticGlow * 0.16})`;
          context.arc(drawX, drawY, radius * 5.5, 0, Math.PI * 2);
          context.fill();
        }
      }

      if (!prefersReducedMotion) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    function updatePointer(event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.targetX = event.clientX / Math.max(width, 1) - 0.5;
      pointer.targetY = event.clientY / Math.max(height, 1) - 0.5;
      pointer.active = true;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    window.addEventListener("scroll", () => {
      scrollTarget = window.scrollY;
    }, { passive: true });

    if (pointerQuery.matches && !prefersReducedMotion) {
      window.addEventListener("pointermove", updatePointer, { passive: true });
      document.documentElement.addEventListener("mouseleave", () => {
        pointer.active = false;
        pointer.targetX = 0;
        pointer.targetY = 0;
      });
    }

    draw(performance.now());

    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(animationFrame);
    }, { once: true });
  }

  function initMagneticInteractions(prefersReducedMotion) {
    const aura = document.getElementById("cursorAura");
    const magneticElements = [...document.querySelectorAll(".magnetic")];
    const glowSurfaces = [...document.querySelectorAll(".portfolio-card, .testimonial, .contact-form, .about-person")];

    if (prefersReducedMotion || !pointerQuery.matches) {
      return;
    }

    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.5;
    let auraX = pointerX;
    let auraY = pointerY;
    let frameRequested = false;

    function updateMagnetism() {
      frameRequested = false;

      auraX += (pointerX - auraX) * 0.18;
      auraY += (pointerY - auraY) * 0.18;

      if (aura) {
        aura.style.left = `${auraX}px`;
        aura.style.top = `${auraY}px`;
      }

      magneticElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width * 0.5;
        const centerY = rect.top + rect.height * 0.5;
        const deltaX = pointerX - centerX;
        const deltaY = pointerY - centerY;
        const distance = Math.hypot(deltaX, deltaY);
        const radius = Math.max(105, Math.min(190, Math.max(rect.width, rect.height) * 0.78));

        if (distance < radius) {
          const strength = Math.pow(1 - distance / radius, 1.65);
          const maxShift = element.matches(".portfolio-card, .testimonial") ? 13 : 8;
          element.style.setProperty("--magnet-x", `${deltaX * strength * (maxShift / radius)}px`);
          element.style.setProperty("--magnet-y", `${deltaY * strength * (maxShift / radius)}px`);
          element.classList.add("is-magnetized");
        } else {
          element.style.setProperty("--magnet-x", "0px");
          element.style.setProperty("--magnet-y", "0px");
          element.classList.remove("is-magnetized");
        }
      });

      glowSurfaces.forEach((surface) => {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--glow-x", `${pointerX - rect.left}px`);
        surface.style.setProperty("--glow-y", `${pointerY - rect.top}px`);
      });

      if (Math.abs(pointerX - auraX) > 0.2 || Math.abs(pointerY - auraY) > 0.2) {
        requestFrame();
      }
    }

    function requestFrame() {
      if (!frameRequested) {
        frameRequested = true;
        window.requestAnimationFrame(updateMagnetism);
      }
    }

    window.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      aura?.classList.add("is-visible");
      requestFrame();
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => {
      aura?.classList.remove("is-visible");
      magneticElements.forEach((element) => {
        element.style.setProperty("--magnet-x", "0px");
        element.style.setProperty("--magnet-y", "0px");
        element.classList.remove("is-magnetized");
      });
    });
  }

  function initContactForm() {
    const contactForm = document.getElementById("contactForm");
    const formMessage = document.getElementById("formMessage");

    if (!(contactForm instanceof HTMLFormElement) || !formMessage) {
      return;
    }

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      formMessage.textContent =
        "Thanks—your project details are ready to be connected to your email or form backend.";
      contactForm.reset();
    });
  }

  function initSite() {
    const prefersReducedMotion = motionQuery.matches;
    initTypedHeadings(prefersReducedMotion);
    initRevealAnimations(prefersReducedMotion);
    initStarfield(prefersReducedMotion);
    initMagneticInteractions(prefersReducedMotion);
    initContactForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSite, { once: true });
  } else {
    initSite();
  }
})();