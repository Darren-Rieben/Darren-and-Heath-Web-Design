(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /*
   * BACKGROUND SETTINGS
   * backgroundMode: "normal" keeps a mostly still white starfield with a
   * small percentage of stars drifting slowly upward.
   * backgroundMode: "static" freezes every star in place.
   */
  const BACKGROUND_SETTINGS = Object.freeze({
    backgroundMode: "dynamic", // "dynamic" or "static"
    cursorColorShift: true,
    starColors: {
      far: "#dfe5ee",
      middle: "#f5f7fb",
      near: "#ffffff",
      interaction: "#a7dcff"
    },
    naturalStarColors: [
      "#ffffff",
      "#e8f3ff",
      "#fff3df",
      "#f4f7ff",
      "#ffe8cf"
    ],
    naturalColorStrength: 0.18,
    density: 1.18,
    maxFps: 30,
    maxDpr: 1.25,
    interactionRadius: 250,
    cursorPullStrength: 1.85,
    cursorSwirlStrength: 1.45,
    movingStarFraction: 0.32,
    fastStarFraction: 0.045,
    colorShiftAmount: 0.14,
    trailLength: 15,
    trailLifetime: 460,
    dynamic: {
      farSpeed: 0.0028,
      middleSpeed: 0.0058,
      nearSpeed: 0.0098,
      fastMinSpeed: 0.021,
      fastMaxSpeed: 0.036
    }
  });

  function initModelViewers() {
    const viewers = [...document.querySelectorAll(".person-model model-viewer")];
    const aboutPeople = document.getElementById("aboutPeople");
    const status = document.getElementById("modelStatus");
    const statusText = document.getElementById("modelStatusText");

    if (viewers.length === 0) return;

    let loadedCount = 0;
    let failedCount = 0;
    let sectionVisible = true;

    const setStatus = (message, state = "loading") => {
      if (!status || !statusText) return;
      statusText.textContent = message;
      status.classList.toggle("is-loaded", state === "loaded");
      status.classList.toggle("is-error", state === "error");
    };

    const updateStatus = () => {
      if (failedCount > 0) {
        setStatus(
          failedCount === viewers.length
            ? "Could not load the 3D models"
            : "One 3D model could not load",
          "error"
        );
        return;
      }

      if (loadedCount === viewers.length) {
        setStatus("3D models loaded", "loaded");
      } else {
        setStatus(`Loading 3D models… ${loadedCount}/${viewers.length}`);
      }
    };

    const updateRotation = () => {
      const activePerson = aboutPeople?.dataset.activePerson || "none";
      viewers.forEach((viewer) => {
        const person = viewer.closest("[data-model-person]")?.dataset.modelPerson || "";
        const shouldRotate =
          sectionVisible &&
          !reducedMotion.matches &&
          (activePerson === "none" || activePerson === person);
        viewer.toggleAttribute("auto-rotate", shouldRotate);
      });
    };

    viewers.forEach((viewer) => {
      viewer.addEventListener("load", () => {
        loadedCount += 1;
        updateStatus();
      }, { once: true });

      viewer.addEventListener("error", (event) => {
        failedCount += 1;
        console.error(`Unable to load ${viewer.getAttribute("src") || "3D model"}`, event);
        updateStatus();
      }, { once: true });
    });

    const viewerReady = customElements.get("model-viewer")
      ? Promise.resolve()
      : customElements.whenDefined("model-viewer");

    Promise.race([
      viewerReady,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("model-viewer library timed out")), 10000);
      })
    ]).then(updateRotation).catch((error) => {
      console.error(error);
      setStatus("3D viewer library failed to load", "error");
    });

    const aboutSection = document.getElementById("about");
    if (aboutSection && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        sectionVisible = entries.some((entry) => entry.isIntersecting);
        updateRotation();
      }, { rootMargin: "180px 0px", threshold: 0.04 });
      observer.observe(aboutSection);
    }

    window.addEventListener("model-focus-change", updateRotation);
    reducedMotion.addEventListener?.("change", updateRotation);
  }

  function initProfileModelFocus() {
    const container = document.getElementById("aboutPeople");
    const stage = container?.querySelector(".dual-model-stage");
    const profiles = container ? [...container.querySelectorAll("[data-person]")] : [];
    if (!container || !stage || profiles.length === 0) return;

    let stickyPerson = "";
    let resetTimer = 0;

    const cancelReset = () => {
      window.clearTimeout(resetTimer);
      resetTimer = 0;
    };

    const setActive = (person = "none") => {
      const normalized = person === "darren" || person === "heath" ? person : "none";
      container.dataset.activePerson = normalized;

      profiles.forEach((profile) => {
        const active = profile.dataset.person === normalized;
        profile.classList.toggle("is-profile-active", active);
        profile.setAttribute("aria-pressed", String(active && stickyPerson === normalized));
      });

      window.dispatchEvent(new CustomEvent("model-focus-change", {
        detail: { person: normalized }
      }));
    };

    const scheduleReset = () => {
      cancelReset();
      resetTimer = window.setTimeout(() => {
        setActive(stickyPerson || "none");
      }, 210);
    };

    profiles.forEach((profile) => {
      const person = profile.dataset.person || "";

      profile.addEventListener("pointerenter", () => {
        cancelReset();
        setActive(person);
      });

      profile.addEventListener("pointerleave", scheduleReset);
      profile.addEventListener("focus", () => {
        cancelReset();
        setActive(person);
      });
      profile.addEventListener("blur", scheduleReset);

      profile.addEventListener("click", () => {
        const wasSticky = stickyPerson === person;
        stickyPerson = wasSticky ? "" : person;
        setActive(stickyPerson || (finePointer.matches ? person : "none"));
      });

      profile.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        profile.click();
      });
    });

    stage.addEventListener("pointerenter", cancelReset);
    stage.addEventListener("pointerleave", scheduleReset);
    stage.addEventListener("focusin", cancelReset);
    stage.addEventListener("focusout", scheduleReset);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      stickyPerson = "";
      setActive("none");
    });

    setActive("none");
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

    const context = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true
    }) || canvas.getContext("2d");
    if (!context) return;

    const root = document.documentElement;
    const mode = BACKGROUND_SETTINGS.backgroundMode === "static" ? "static" : "dynamic";
    root.dataset.backgroundMode = mode;

    const pointer = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      inside: false,
      magneticStrength: 0,
      targetMagneticStrength: 0,
      trail: []
    };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let animationFrame = 0;
    let lastFrame = 0;
    let resizeTimer = 0;
    let isPageVisible = !document.hidden;

    const frameInterval = 1000 / Math.max(12, BACKGROUND_SETTINGS.maxFps);
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const hexToRgb = (hex) => {
      const normalized = String(hex).replace("#", "").trim();
      const expanded = normalized.length === 3
        ? normalized.split("").map((character) => character + character).join("")
        : normalized;
      const value = Number.parseInt(expanded, 16);
      if (!Number.isFinite(value)) return { r: 255, g: 255, b: 255 };
      return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
      };
    };

    const mixRgb = (first, second, amount) => ({
      r: Math.round(first.r + (second.r - first.r) * amount),
      g: Math.round(first.g + (second.g - first.g) * amount),
      b: Math.round(first.b + (second.b - first.b) * amount)
    });

    const palette = {
      far: hexToRgb(BACKGROUND_SETTINGS.starColors.far),
      middle: hexToRgb(BACKGROUND_SETTINGS.starColors.middle),
      near: hexToRgb(BACKGROUND_SETTINGS.starColors.near),
      interaction: hexToRgb(BACKGROUND_SETTINGS.starColors.interaction),
      natural: BACKGROUND_SETTINGS.naturalStarColors.map(hexToRgb)
    };

    const chooseLayer = () => {
      const value = Math.random();
      if (value < 0.57) return "far";
      if (value < 0.89) return "middle";
      return "near";
    };

    const createStar = () => {
      const layer = chooseLayer();
      const depth = layer === "far" ? 0.34 : layer === "middle" ? 0.68 : 1;
      const speed = layer === "far"
        ? BACKGROUND_SETTINGS.dynamic.farSpeed
        : layer === "middle"
          ? BACKGROUND_SETTINGS.dynamic.middleSpeed
          : BACKGROUND_SETTINGS.dynamic.nearSpeed;
      const isFast = Math.random() < BACKGROUND_SETTINGS.fastStarFraction;
      const moving = isFast || Math.random() < BACKGROUND_SETTINGS.movingStarFraction;
      const fastSpeed = BACKGROUND_SETTINGS.dynamic.fastMinSpeed
        + Math.random() * (BACKGROUND_SETTINGS.dynamic.fastMaxSpeed - BACKGROUND_SETTINGS.dynamic.fastMinSpeed);
      const baseColor = palette[layer];
      const naturalColor = palette.natural[Math.floor(Math.random() * palette.natural.length)];
      const temperatureMix = Math.random() * BACKGROUND_SETTINGS.naturalColorStrength;

      return {
        layer,
        depth,
        moving,
        isFast,
        baseColor: mixRgb(baseColor, naturalColor, temperatureMix),
        x: Math.random() * Math.max(width, 1),
        y: Math.random() * Math.max(height, 1),
        radius: isFast
          ? 1.55 + Math.random() * 0.9
          : (0.52 + depth * 0.76) * (0.72 + Math.random() * 0.5),
        velocityX: isFast ? (Math.random() - 0.5) * 0.01 : (Math.random() - 0.5) * 0.0014,
        velocityY: moving ? -(isFast ? fastSpeed : speed * (0.72 + Math.random() * 0.62)) : 0,
        alpha: isFast ? 0.74 + Math.random() * 0.18 : 0.36 + depth * 0.44 + Math.random() * 0.14,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.0001 + Math.random() * 0.00024
      };
    };

    const resetStars = () => {
      const baseCount = Math.min(360, Math.max(145, Math.round((width * height) / 7600)));
      const count = Math.round(baseCount * clamp(BACKGROUND_SETTINGS.density, 0.35, 1.45));
      stars = Array.from({ length: count }, createStar);
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, BACKGROUND_SETTINGS.maxDpr);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetStars();
    };

    const recycleStar = (star) => {
      star.y = height + 10 + Math.random() * 30;
      star.x = Math.random() * width;
    };

    const drawTrail = (time) => {
      if (!pointer.inside || reducedMotion.matches || pointer.trail.length < 2) return;

      pointer.trail = pointer.trail.filter((point) => time - point.time < BACKGROUND_SETTINGS.trailLifetime);
      for (let index = 1; index < pointer.trail.length; index += 1) {
        const previous = pointer.trail[index - 1];
        const current = pointer.trail[index];
        const age = time - current.time;
        const life = clamp(1 - age / BACKGROUND_SETTINGS.trailLifetime, 0, 1);
        const alpha = life * (0.035 + pointer.magneticStrength * 0.055);
        if (alpha <= 0.002) continue;

        context.strokeStyle = `rgba(162, 216, 255, ${alpha})`;
        context.lineWidth = 0.55 + life * 0.8;
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(current.x, current.y);
        context.stroke();
      }
    };

    const draw = (time) => {
      animationFrame = window.requestAnimationFrame(draw);
      if (!isPageVisible || time - lastFrame < frameInterval) return;

      const delta = Math.min(time - lastFrame || frameInterval, 60);
      lastFrame = time;
      pointer.magneticStrength +=
        (pointer.targetMagneticStrength - pointer.magneticStrength) * 0.16;

      context.clearRect(0, 0, width, height);
      drawTrail(time);

      for (const star of stars) {
        if (mode === "dynamic" && star.moving && !reducedMotion.matches) {
          star.x += star.velocityX * delta;
          star.y += star.velocityY * delta;

          if (star.y < -14 || star.x < -18 || star.x > width + 18) {
            recycleStar(star);
          }
        }

        let x = star.x;
        let y = star.y;
        let colorBlend = 0;
        let closeGlow = 0;
        let outerDim = 0;

        if (pointer.inside) {
          const dx = pointer.x - x;
          const dy = pointer.y - y;
          const distance = Math.hypot(dx, dy);
          const proximity = clamp(1 - distance / BACKGROUND_SETTINGS.interactionRadius, 0, 1);

          if (proximity > 0) {
            const eased = proximity * proximity * (3 - 2 * proximity);
            const magneticBoost = 0.58 + pointer.magneticStrength * 0.42;
            const pull =
              eased * magneticBoost * (0.0065 + star.depth * 0.0085) *
              BACKGROUND_SETTINGS.cursorPullStrength;
            const swirl =
              eased * (0.0017 + star.depth * 0.0025) *
              BACKGROUND_SETTINGS.cursorSwirlStrength;

            x += dx * pull - dy * swirl;
            y += dy * pull + dx * swirl;

            closeGlow = Math.pow(proximity, 3.05);
            outerDim = Math.sin(Math.PI * proximity) * (1 - closeGlow) * 0.09;
            colorBlend = Math.min(
              BACKGROUND_SETTINGS.colorShiftAmount,
              eased * (0.026 + pointer.magneticStrength * 0.085)
            );
          }
        }

        const color = BACKGROUND_SETTINGS.cursorColorShift
          ? mixRgb(star.baseColor, palette.interaction, colorBlend)
          : star.baseColor;
        const pulse = 0.88 + Math.sin(time * star.pulseSpeed + star.pulse) * 0.12;
        const alpha = clamp(
          star.alpha * pulse * (1 - outerDim) + closeGlow * (0.25 + pointer.magneticStrength * 0.1),
          0.1,
          1
        );
        const radius = star.radius + closeGlow * (star.isFast ? 0.62 : 0.4);

        context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

        if (star.isFast || radius > 1.6) {
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(x - radius / 2, y - radius / 2, radius, radius);
        }
      }
    };

    resize();
    animationFrame = window.requestAnimationFrame(draw);

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 140);
    }, { passive: true });

    window.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;

      const previous = pointer.trail[pointer.trail.length - 1];
      if (!previous || Math.hypot(previous.x - pointer.x, previous.y - pointer.y) > 5) {
        pointer.trail.push({ x: pointer.x, y: pointer.y, time: performance.now() });
        if (pointer.trail.length > BACKGROUND_SETTINGS.trailLength) pointer.trail.shift();
      }
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => {
      pointer.inside = false;
      pointer.targetMagneticStrength = 0;
      pointer.trail.length = 0;
    });

    window.addEventListener("blur", () => {
      pointer.inside = false;
      pointer.targetMagneticStrength = 0;
      pointer.trail.length = 0;
    });

    window.addEventListener("magnetic-proximity", (event) => {
      const detail = event.detail || {};
      pointer.x = Number.isFinite(detail.x) ? detail.x : pointer.x;
      pointer.y = Number.isFinite(detail.y) ? detail.y : pointer.y;
      pointer.targetMagneticStrength = clamp(Number(detail.strength) || 0, 0, 1);
    });

    document.addEventListener("visibilitychange", () => {
      isPageVisible = !document.hidden;
      lastFrame = performance.now();
    });

    reducedMotion.addEventListener?.("change", () => {
      lastFrame = performance.now();
    });

    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(animationFrame);
    }, { once: true });
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
    const warpLens = document.getElementById("cursorWarp");
    const elements = [...document.querySelectorAll(".magnetic")];
    const warpTargets = [...document.querySelectorAll("[data-reveal], .magnetic")];
    const root = document.documentElement;

    if (reducedMotion.matches || elements.length === 0) return;

    const activationRadius = 145;
    const warpRadius = 190;
    const pointer = { x: 0, y: 0, inside: false };
    let activeElement = null;
    let scheduledFrame = 0;
    let lastMagneticFrame = 0;
    const magneticFrameInterval = 1000 / 30;

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const resetElement = (element) => {
      if (!element) return;
      element.style.setProperty("--magnet-x", "0px");
      element.style.setProperty("--magnet-y", "0px");
      element.style.setProperty("--magnet-strength", "0");
      element.classList.remove("is-magnetized");
    };

    const resetWarp = (element) => {
      element.style.setProperty("--warp-x", "0px");
      element.style.setProperty("--warp-y", "0px");
      element.style.setProperty("--warp-rotate", "0deg");
    };

    const publishProximity = (strength) => {
      const normalized = clamp(strength, 0, 1);
      root.style.setProperty("--interaction-strength", normalized.toFixed(3));
      root.style.setProperty("--pointer-x", `${pointer.x}px`);
      root.style.setProperty("--pointer-y", `${pointer.y}px`);
      root.style.setProperty("--cursor-hue", `${204 + normalized * 7}`);
      root.style.setProperty("--cursor-saturation", `${Math.round(16 + normalized * 68)}%`);
      root.style.setProperty("--cursor-lightness", `${Math.round(88 - normalized * 20)}%`);

      window.dispatchEvent(new CustomEvent("magnetic-proximity", {
        detail: { x: pointer.x, y: pointer.y, strength: normalized }
      }));

      if (aura) {
        aura.style.left = `${pointer.x}px`;
        aura.style.top = `${pointer.y}px`;
        aura.classList.toggle("is-visible", pointer.inside);
      }

      if (warpLens) {
        warpLens.style.left = `${pointer.x}px`;
        warpLens.style.top = `${pointer.y}px`;
        warpLens.classList.toggle("is-visible", pointer.inside);
      }
    };

    const distanceToRect = (x, y, rect) => {
      const dx = Math.max(rect.left - x, 0, x - rect.right);
      const dy = Math.max(rect.top - y, 0, y - rect.bottom);
      return Math.hypot(dx, dy);
    };

    const updateWarpTargets = () => {
      for (const element of warpTargets) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
        const rawStrength = clamp(1 - distance / warpRadius, 0, 1);

        if (!pointer.inside || rawStrength <= 0) {
          resetWarp(element);
          continue;
        }

        const strength = rawStrength * rawStrength;
        const moveX = clamp((pointer.x - centerX) * 0.008 * strength, -3.2, 3.2);
        const moveY = clamp((pointer.y - centerY) * 0.007 * strength, -2.8, 2.8);
        const rotate = clamp((pointer.x - centerX) / Math.max(rect.width, 1) * 0.34 * strength, -0.24, 0.24);

        element.style.setProperty("--warp-x", `${moveX.toFixed(2)}px`);
        element.style.setProperty("--warp-y", `${moveY.toFixed(2)}px`);
        element.style.setProperty("--warp-rotate", `${rotate.toFixed(3)}deg`);
      }
    };

    const update = (time) => {
      scheduledFrame = 0;

      if (time - lastMagneticFrame < magneticFrameInterval) {
        scheduledFrame = window.requestAnimationFrame(update);
        return;
      }
      lastMagneticFrame = time;

      updateWarpTargets();

      if (!pointer.inside) {
        resetElement(activeElement);
        activeElement = null;
        publishProximity(0);
        return;
      }

      let nearest = null;
      let nearestRect = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const distance = distanceToRect(pointer.x, pointer.y, rect);
        if (distance < nearestDistance) {
          nearest = element;
          nearestRect = rect;
          nearestDistance = distance;
        }
      }

      if (!nearest || !nearestRect || nearestDistance > activationRadius) {
        resetElement(activeElement);
        activeElement = null;
        publishProximity(0);
        return;
      }

      if (activeElement && activeElement !== nearest) resetElement(activeElement);
      activeElement = nearest;

      const rawStrength = 1 - nearestDistance / activationRadius;
      const strength = rawStrength * rawStrength * (3 - 2 * rawStrength);
      const centerX = nearestRect.left + nearestRect.width / 2;
      const centerY = nearestRect.top + nearestRect.height / 2;
      const isLargeSurface = nearest.matches(".portfolio-card, .testimonial, .about-person");
      const maxMovement = isLargeSurface ? 6 : 10;
      const movementFactor = isLargeSurface ? 0.03 : 0.068;
      const moveX = clamp((pointer.x - centerX) * movementFactor * strength, -maxMovement, maxMovement);
      const moveY = clamp((pointer.y - centerY) * movementFactor * strength, -maxMovement, maxMovement);

      nearest.style.setProperty("--magnet-x", `${moveX.toFixed(2)}px`);
      nearest.style.setProperty("--magnet-y", `${moveY.toFixed(2)}px`);
      nearest.style.setProperty("--magnet-strength", strength.toFixed(3));
      nearest.classList.add("is-magnetized");
      publishProximity(strength);
    };

    const scheduleUpdate = () => {
      if (!scheduledFrame) scheduledFrame = window.requestAnimationFrame(update);
    };

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      scheduleUpdate();
    }, { passive: true });

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => {
      pointer.inside = false;
      scheduleUpdate();
    });

    window.addEventListener("blur", () => {
      pointer.inside = false;
      scheduleUpdate();
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


  function initFooterMetadata() {
    const yearElement = document.getElementById("copyrightYear");
    const lastEditedElement = document.getElementById("lastEdited");

    if (yearElement) {
      yearElement.textContent = String(new Date().getFullYear());
    }

    if (!lastEditedElement) return;

    const parsedDate = new Date(document.lastModified);
    if (Number.isNaN(parsedDate.getTime())) return;

    lastEditedElement.dateTime = parsedDate.toISOString();
    lastEditedElement.textContent = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    }).format(parsedDate);
  }

  function initSite() {
    initModelViewers();
    initProfileModelFocus();
    initTypedHeadings();
    initRevealAnimations();
    initStarfield();
    initShootingStar();
    initMagneticInteractions();
    initContactForm();
    initFooterMetadata();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSite, { once: true });
  } else {
    initSite();
  }
})();