(() => {
  "use strict";

  function initSite() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    function animateTypedTitle(titleElement, speed = 58) {
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

      window.setTimeout(typeNextCharacter, 180);
    }

    function runTitleOnce(titleElement, speed = 58) {
      if (animatedTitles.has(titleElement)) {
        return;
      }

      animatedTitles.add(titleElement);
      animateTypedTitle(titleElement, speed);
    }

    typedHeadings.forEach((titleElement) => {
      if (!titleElement.hasAttribute("data-animate-on-view")) {
        runTitleOnce(titleElement, 55);
      }
    });

    const viewTriggeredTitles = document.querySelectorAll(
      ".typed-title[data-animate-on-view='true']"
    );

    if ("IntersectionObserver" in window && !prefersReducedMotion) {
      const titleObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              runTitleOnce(entry.target, 58);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.2,
          rootMargin: "0px 0px -10% 0px"
        }
      );

      viewTriggeredTitles.forEach((titleElement) => titleObserver.observe(titleElement));
    } else {
      viewTriggeredTitles.forEach((titleElement) => runTitleOnce(titleElement, 58));
    }

    const heroModel = document.getElementById("heroModel");
    const modelStatus = document.getElementById("modelStatus");
    const modelStatusText = document.getElementById("modelStatusText");

    if (heroModel && modelStatus && modelStatusText) {
      let hideStatusTimer = null;

      function updateModelStatus(message, state = "") {
        modelStatusText.textContent = message;
        modelStatus.classList.remove("is-ready", "is-error");

        if (state) {
          modelStatus.classList.add(state);
        }
      }

      heroModel.addEventListener("load", () => {
        updateModelStatus("3D model ready", "is-ready");
        window.clearTimeout(hideStatusTimer);
        hideStatusTimer = window.setTimeout(() => {
          modelStatus.style.opacity = "0.62";
        }, 2600);
      });

      heroModel.addEventListener("error", () => {
        updateModelStatus("Add model.glb beside index.html", "is-error");
        modelStatus.style.opacity = "1";
      });

      heroModel.addEventListener("progress", (event) => {
        if (event.detail.totalProgress < 1) {
          const percent = Math.round(event.detail.totalProgress * 100);
          updateModelStatus(`Loading 3D model… ${percent}%`);
        }
      });

      heroModel.addEventListener("camera-change", (event) => {
        if (event.detail.source === "user-interaction") {
          modelStatus.style.opacity = "0.35";
        }
      });

      heroModel.addEventListener("interact-stopped", () => {
        modelStatus.style.opacity = "0.62";
      });
    }

    const contactForm = document.getElementById("contactForm");
    const formMessage = document.getElementById("formMessage");

    if (contactForm && formMessage) {
      contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        formMessage.textContent =
          "Thanks. Your request is captured and ready to be connected to your email or backend.";
        contactForm.reset();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSite, { once: true });
  } else {
    initSite();
  }
})();