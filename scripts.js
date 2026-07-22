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