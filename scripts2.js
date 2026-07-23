(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function initModelViewer() {
    const model = document.getElementById("heroModel");
    const status = document.getElementById("modelStatus");
    const statusText = document.getElementById("modelStatusText");

    if (!model) return;

    const setStatus = (message, state = "loading") => {
      if (!status || !statusText) return;
      statusText.textContent = message;
      status.classList.toggle("is-loaded", state === "loaded");
      status.classList.toggle("is-error", state === "error");
    };

    model.addEventListener("load", () => {
      setStatus("3D model loaded", "loaded");
    });

    model.addEventListener("error", (event) => {
      console.error("Unable to load assets/3dmodel.glb", event);
      setStatus("Could not load assets/3dmodel.glb", "error");
    });

    const viewerReady = customElements.get("model-viewer")
      ? Promise.resolve()
      : customElements.whenDefined("model-viewer");

    Promise.race([
      viewerReady,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("model-viewer library timed out")), 10000);
      })
    ]).catch((error) => {
      console.error(error);
      setStatus("3D viewer library failed to load", "error");
    });
  }

  function initTypedHeadings() {
    const animated = new WeakSet();
    const headings = [...document.querySelectorAll(".typed-title")];

    const showFullText = (heading) => {
      const target = heading.querySelector(".typed-content");
      if (target) target.textContent = heading.dataset.text || target.textContent || "";
      heading.classList.add("is-complete");
    };

    const animate = (heading, speed = 48) => {
      if (animated.has(heading)) return;
      animated.add(heading);

      const target = heading.querySelector(".typed-content");
      const text = heading.dataset.text || target?.textContent || "";
      if (!target || !text) return;

      if (reducedMotion.matches) {
        showFullText(heading);
        return;
      }

      target.textContent = "";
      let index = 0;

      const typeCharacter = () => {
        index += 1;
        target.textContent = text.slice(0, index);
        if (index < text.length) {
          window.setTimeout(typeCharacter, speed);
        } else {
          heading.classList.add("is-complete");
        }
      };

      window.setTimeout(typeCharacter, 160);
    };

    headings
      .filter((heading) => !heading.hasAttribute("data-animate-on-view"))
      .forEach((heading) => animate(heading, 44));

    const observed = headings.filter((heading) => heading.hasAttribute("data-animate-on-view"));
    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      observed.forEach((heading) => animate(heading));
      return;
    }

    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.28, rootMargin: "0px 0px -10% 0px" });

    observed.forEach((heading) => observer.observe(heading));
  }

  function initRevealAnimations() {
    const items = [...document.querySelectorAll("[data-reveal]")];

    items.forEach((item, index) => {
      const customDelay = Number.parseInt(item.dataset.revealDelay || "", 10);
      const delay = Number.isFinite(customDelay) ? customDelay : Math.min((index % 4) * 80, 240);
      item.style.transitionDelay = `${delay}ms`;
    });

    document.body.classList.add("reveal-ready");

    if (!("IntersectionObserver" in window) || reducedMotion.matches) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.13, rootMargin: "0px 0px -8% 0px" });

    items.forEach((item) => observer.observe(item));
  }

  function initStarfield() {
    const canvas = document.getElementById("starfield");
    if (!(canvas instanceof HTMLCanvasElement)) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const pointer = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
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
    let frame = 0;
    let lastTime = performance.now();
    let smoothScroll = window.scrollY;

    const createStar = () => {
      const depth = Math.random();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        radius: 0.35 + depth * 1.25,
        alpha: 0.16 + depth * 0.58,
        phase: Math.random() * Math.PI * 2,
        speed: 0.00035 + Math.random() * 0.0007,
        drift: 0.01 + depth * 0.03
      };
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(300, Math.max(110, Math.round((width * height) / 7200)));
      stars = Array.from({ length: count }, createStar);
    };

    const draw = (time) => {
      const delta = Math.min(time - lastTime, 40);
      lastTime = time;

      pointer.smoothX += (pointer.targetX - pointer.smoothX) * 0.055;
      pointer.smoothY += (pointer.targetY - pointer.smoothY) * 0.055;
      smoothScroll += (window.scrollY - smoothScroll) * 0.045;

      context.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        star.y += star.drift * delta;
        if (star.y > height + 8) {
          star.y = -8;
          star.x = Math.random() * width;
        }

        const layer = 0.25 + star.depth * 1.1;
        let x = star.x + pointer.smoothX * layer * 21;
        let y = star.y + pointer.smoothY * layer * 15 - smoothScroll * 0.017 * layer;

        y = ((y + 12) % (height + 24) + height + 24) % (height + 24) - 12;

        const distanceX = pointer.x - x;
        const distanceY = pointer.y - y;
        const distance = Math.hypot(distanceX, distanceY);
        let attraction = 0;

        if (pointer.active && distance < 190 && distance > 0.1) {
          attraction = Math.pow(1 - distance / 190, 2) * (0.25 + star.depth * 0.75);
          x += distanceX * attraction * 0.12;
          y += distanceY * attraction * 0.12;
        }

        const twinkle = 0.76 + Math.sin(time * star.speed + star.phase) * 0.24;
        const alpha = Math.min(1, star.alpha * twinkle + attraction * 0.55);
        const radius = star.radius + attraction * 1.1;

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(226, 236, 250, ${alpha})`;
        context.fill();
      });

      frame = window.requestAnimationFrame(draw);
    };

    const renderStatic = () => {
      context.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        context.beginPath();
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(226, 236, 250, ${star.alpha})`;
        context.fill();
      });
    };

    const start = () => {
      window.cancelAnimationFrame(frame);
      lastTime = performance.now();
      if (reducedMotion.matches) renderStatic();
      else frame = window.requestAnimationFrame(draw);
    };

    resize();
    start();

    window.addEventListener("resize", () => {
      resize();
      if (reducedMotion.matches) renderStatic();
    }, { passive: true });

    window.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.targetX = event.clientX / Math.max(width, 1) - 0.5;
      pointer.targetY = event.clientY / Math.max(height, 1) - 0.5;
      pointer.active = true;
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => {
      pointer.active = false;
      pointer.targetX = 0;
      pointer.targetY = 0;
    });

    reducedMotion.addEventListener?.("change", start);
  }


  function initShootingStar() {
    const star = document.getElementById("shootingStar");
    if (!(star instanceof HTMLAnchorElement) || reducedMotion.matches) return;

    let timer = 0;
    let flight = null;
    let isPausedByPointer = false;

    const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

    const schedule = (minimum = 28000, maximum = 60000) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(launch, randomBetween(minimum, maximum));
    };

    const makeRoute = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const margin = 150;
      const direction = Math.random() < 0.5 ? 1 : -1;
      const startX = direction > 0 ? -margin : width + margin;
      const endX = direction > 0 ? width + margin : -margin;
      const startY = Math.random() < 0.76
        ? randomBetween(height * 0.08, height * 0.34)
        : randomBetween(height * 0.64, height * 0.82);
      const verticalTravel = randomBetween(height * 0.12, height * 0.28) * (Math.random() < 0.76 ? 1 : -1);
      const endY = Math.max(-80, Math.min(height + 80, startY + verticalTravel));
      const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

      return { startX, startY, endX, endY, angle };
    };

    const finish = () => {
      star.classList.remove("is-active");
      star.tabIndex = -1;
      flight = null;
      isPausedByPointer = false;
      schedule();
    };

    function launch() {
      if (document.hidden || flight) {
        schedule(5000, 9000);
        return;
      }

      const route = makeRoute();
      const duration = randomBetween(1450, 2050);
      star.classList.add("is-active");
      star.tabIndex = 0;

      flight = star.animate(
        [
          {
            transform: `translate3d(${route.startX}px, ${route.startY}px, 0) rotate(${route.angle}deg) scale(0.82)`,
            opacity: 0
          },
          {
            offset: 0.12,
            opacity: 0.9
          },
          {
            offset: 0.82,
            opacity: 0.88
          },
          {
            transform: `translate3d(${route.endX}px, ${route.endY}px, 0) rotate(${route.angle}deg) scale(1)`,
            opacity: 0
          }
        ],
        {
          duration,
          easing: "cubic-bezier(0.22, 0.66, 0.24, 1)",
          fill: "forwards"
        }
      );

      flight.addEventListener("finish", finish, { once: true });
      flight.addEventListener("cancel", finish, { once: true });
    }

    star.addEventListener("pointerenter", () => {
      if (!flight) return;
      isPausedByPointer = true;
      flight.pause();
    });

    star.addEventListener("pointerleave", () => {
      if (!flight || !isPausedByPointer) return;
      isPausedByPointer = false;
      flight.play();
    });

    star.addEventListener("focus", () => flight?.pause());
    star.addEventListener("blur", () => {
      if (flight && !isPausedByPointer) flight.play();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        flight?.cancel();
        window.clearTimeout(timer);
      } else {
        schedule(10000, 18000);
      }
    });

    schedule(10000, 18000);
  }

  function initMagneticInteractions() {
    const aura = document.getElementById("cursorAura");
    const elements = [...document.querySelectorAll(".magnetic")];

    if (!finePointer.matches || reducedMotion.matches) return;

    window.addEventListener("pointermove", (event) => {
      if (aura) {
        aura.style.left = `${event.clientX}px`;
        aura.style.top = `${event.clientY}px`;
        aura.classList.add("is-visible");
      }
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => {
      aura?.classList.remove("is-visible");
    });

    elements.forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const bounds = element.getBoundingClientRect();
        const x = event.clientX - (bounds.left + bounds.width / 2);
        const y = event.clientY - (bounds.top + bounds.height / 2);
        const strength = element.matches(".portfolio-card, .testimonial") ? 0.055 : 0.11;

        element.style.setProperty("--magnet-x", `${x * strength}px`);
        element.style.setProperty("--magnet-y", `${y * strength}px`);
        element.classList.add("is-magnetized");
      });

      element.addEventListener("pointerleave", () => {
        element.style.setProperty("--magnet-x", "0px");
        element.style.setProperty("--magnet-y", "0px");
        element.classList.remove("is-magnetized");
      });
    });
  }

  function initContactForm() {
    const form = document.getElementById("contactForm");
    const message = document.getElementById("formMessage");
    if (!(form instanceof HTMLFormElement) || !message) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const buttonLabel = submitButton?.querySelector(".button-label");
    const endpoint = "https://formsubmit.co/ajax/darrenheathwebdev@gmail.com";

    const setStatus = (text, state = "") => {
      message.textContent = text;
      message.classList.remove("is-success", "is-error");
      if (state) message.classList.add(`is-${state}`);
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      submitButton?.setAttribute("disabled", "");
      form.setAttribute("aria-busy", "true");
      if (buttonLabel) buttonLabel.textContent = "Sending…";
      setStatus("Sending your project details…");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form)
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) {
          throw new Error(result.message || "The form service could not accept the submission.");
        }

        form.reset();
        setStatus("Thanks — your request was sent. We will reach out soon.", "success");
      } catch (error) {
        console.error("Contact form submission failed:", error);
        setStatus(
          "The form could not send right now. Please email darrenheathwebdev@gmail.com directly.",
          "error"
        );
      } finally {
        submitButton?.removeAttribute("disabled");
        form.removeAttribute("aria-busy");
        if (buttonLabel) buttonLabel.textContent = "Send request";
      }
    });
  }

  function initSite() {
    initModelViewer();
    initTypedHeadings();
    initRevealAnimations();
    initStarfield();
    initShootingStar();
    initMagneticInteractions();
    initContactForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSite, { once: true });
  } else {
    initSite();
  }
})();