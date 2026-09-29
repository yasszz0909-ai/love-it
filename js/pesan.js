// ==========================================================================
// PESAN CINTA UNTUK VIIA - SCRIPT (pesan.js)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const audioEl = document.getElementById("pesan-audio");
  const audioPill = document.getElementById("audio-toggle-btn");
  const audioStatusText = document.getElementById("audio-status-text");

  const btnStep1 = document.getElementById("btn-step-1");
  const step2Card = document.getElementById("step-2-card");
  const btnStep2 = document.getElementById("btn-step-2");
  const step3Card = document.getElementById("step-3-card");

  const btnOpenReply = document.getElementById("btn-open-reply");
  const replyFormWrapper = document.getElementById("reply-form-wrapper");
  const btnSelesai = document.getElementById("btn-selesai");

  const replyResultWrapper = document.getElementById("reply-result-wrapper");
  const previewContent = document.getElementById("preview-content");
  const btnCopyMsg = document.getElementById("btn-copy-msg");
  const btnSendDiscord = document.getElementById("btn-send-discord");
  const btnEditAgain = document.getElementById("btn-edit-again");

  const inputDari = document.getElementById("input-dari");
  const inputPesan = document.getElementById("input-pesan");
  const inputSingkat = document.getElementById("input-singkat");
  const skyToast = document.getElementById("sky-toast");
  const toastText = document.getElementById("toast-text");

  let formattedResult = "";

  // --------------------------------------------------------------------------
  // 1. Audio Controller (Kita Lewati Berdua - song.mp3)
  // --------------------------------------------------------------------------
  let isPlayingAudio = false;

  function toggleAudio() {
    if (!audioEl) return;
    if (audioEl.paused) {
      audioEl.play().then(() => {
        isPlayingAudio = true;
        audioPill.classList.remove("paused");
        if (audioStatusText) audioStatusText.textContent = "Musik Memutar";
      }).catch(() => {
        // User interaction required on some mobile browsers
      });
    } else {
      audioEl.pause();
      isPlayingAudio = false;
      audioPill.classList.add("paused");
      if (audioStatusText) audioStatusText.textContent = "Musik Dijeda";
    }
  }

  if (audioPill) {
    audioPill.addEventListener("click", toggleAudio);
  }

  // Attempt romantic soft autoplay on first screen interaction
  function tryAutoplayOnce() {
    if (audioEl && audioEl.paused) {
      audioEl.volume = 0.55;
      audioEl.play().then(() => {
        isPlayingAudio = true;
        if (audioPill) audioPill.classList.remove("paused");
        if (audioStatusText) audioStatusText.textContent = "Musik Memutar";
      }).catch(() => {});
    }
    document.removeEventListener("click", tryAutoplayOnce);
    document.removeEventListener("touchstart", tryAutoplayOnce);
  }

  document.addEventListener("click", tryAutoplayOnce, { once: true });
  document.addEventListener("touchstart", tryAutoplayOnce, { once: true });

  // --------------------------------------------------------------------------
  // 2. Cascading Reveal Navigation
  // --------------------------------------------------------------------------

  // Step 1 -> Step 2
  if (btnStep1) {
    btnStep1.addEventListener("click", () => {
      // Ensure audio plays when user presses the first button
      if (audioEl && audioEl.paused) {
        audioEl.play().catch(() => {});
        if (audioPill) audioPill.classList.remove("paused");
      }

      // Step 1 stays visible! Step 2 appears below Step 1
      if (step2Card) {
        step2Card.classList.remove("step-hidden");
        step2Card.classList.add("step-visible");
        
        // Disable Step 1 button to show it has progressed
        btnStep1.style.opacity = "0.7";
        btnStep1.style.pointerEvents = "none";
        btnStep1.innerHTML = `Terbuka ✨`;

        // Smooth scroll to Step 2
        setTimeout(() => {
          step2Card.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    });
  }

  // Step 2 -> Step 3
  if (btnStep2) {
    btnStep2.addEventListener("click", () => {
      // Step 1 & Step 2 stay visible! Step 3 appears below Step 2
      if (step3Card) {
        step3Card.classList.remove("step-hidden");
        step3Card.classList.add("step-visible");

        // Disable Step 2 button to show it has progressed
        btnStep2.style.opacity = "0.7";
        btnStep2.style.pointerEvents = "none";
        btnStep2.innerHTML = `Terbuka ❤️`;

        // Smooth scroll to Step 3
        setTimeout(() => {
          step3Card.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. Step 3: Heart Loop, Reply Form & Actions
  // --------------------------------------------------------------------------

  // Open Reply Form
  if (btnOpenReply) {
    btnOpenReply.addEventListener("click", () => {
      btnOpenReply.style.display = "none";
      if (replyFormWrapper) {
        replyFormWrapper.classList.add("active");
        setTimeout(() => {
          if (inputPesan) inputPesan.focus();
        }, 200);
      }
    });
  }

  // Submit Form (Selesai)
  if (btnSelesai) {
    btnSelesai.addEventListener("click", () => {
      const dari = (inputDari && inputDari.value.trim()) ? inputDari.value.trim() : "Viia";
      const pesan = (inputPesan && inputPesan.value.trim()) ? inputPesan.value.trim() : "(Belum ada pesan)";
      const singkat = (inputSingkat && inputSingkat.value.trim()) ? inputSingkat.value.trim() : "I Love You too❤️";

      // Exact structure requested:
      // (pesan)
      // (kata kata singkat)
      // From (dari)
      formattedResult = `${pesan}\n\n${singkat}\n\nFrom ${dari}`;

      if (previewContent) {
        previewContent.textContent = formattedResult;
      }

      if (replyFormWrapper) replyFormWrapper.classList.remove("active");
      if (replyResultWrapper) replyResultWrapper.classList.add("active");

      showToast("Pesan balasanmu sudah siap! ✨");
    });
  }

  // Edit again
  if (btnEditAgain) {
    btnEditAgain.addEventListener("click", () => {
      if (replyResultWrapper) replyResultWrapper.classList.remove("active");
      if (replyFormWrapper) replyFormWrapper.classList.add("active");
    });
  }

  // Copy Button
  if (btnCopyMsg) {
    btnCopyMsg.addEventListener("click", () => {
      if (!formattedResult) return;
      copyToClipboard(formattedResult, () => {
        showToast("Pesan berhasil disalin ke clipboard! 📋✨");
      });
    });
  }

  // Kirim to Discord Button
  // Direct Discord profile URL for yasszz_09
  const discordProfileUrl = "https://discord.com/users/1423515761351065661";

  if (btnSendDiscord) {
    btnSendDiscord.addEventListener("click", () => {
      if (!formattedResult) return;

      // 1. Copy formatted text to clipboard so it's ready to paste into chat
      copyToClipboard(formattedResult, () => {
        showToast("Pesan disalin! Membuka Discord yasszz_09... 💌");
      });

      // 2. Open Discord profile in new tab / application
      setTimeout(() => {
        window.open(discordProfileUrl, "_blank");
      }, 400);
    });
  }

  function copyToClipboard(text, callback) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(callback).catch(() => {
        fallbackCopy(text, callback);
      });
    } else {
      fallbackCopy(text, callback);
    }
  }

  function fallbackCopy(text, callback) {
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = text;
    tempTextArea.style.position = "fixed";
    tempTextArea.style.left = "-9999px";
    document.body.appendChild(tempTextArea);
    tempTextArea.focus();
    tempTextArea.select();
    try {
      document.execCommand("copy");
      if (callback) callback();
    } catch (e) {
      showToast("Gagal menyalin otomatis, silakan copy manual.");
    }
    document.body.removeChild(tempTextArea);
  }

  let toastTimer = null;
  function showToast(message) {
    if (!skyToast || !toastText) return;
    toastText.textContent = message;
    skyToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      skyToast.classList.remove("show");
    }, 3800);
  }

  // --------------------------------------------------------------------------
  // 4. Romantic Sky Canvas Particles (Floating Hearts & Sparkles)
  // --------------------------------------------------------------------------
  const canvas = document.getElementById("sky-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const maxParticles = Math.min(30, Math.floor(width / 25));

    class HeartParticle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + 20 + Math.random() * 50;
        this.size = Math.random() * 9 + 6;
        this.speedY = Math.random() * 0.9 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.6;
        this.opacity = Math.random() * 0.6 + 0.25;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.03 + 0.01;
        // Romantic colors: soft pink, light rose, celestial white
        const colors = [
          "rgba(255, 182, 193, ",
          "rgba(251, 113, 133, ",
          "rgba(254, 205, 211, ",
          "rgba(255, 255, 255, "
        ];
        this.colorPrefix = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.y -= this.speedY;
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 0.7 + this.speedX;

        if (this.y < -30) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.fillStyle = this.colorPrefix + this.opacity + ")";
        ctx.translate(this.x, this.y);
        ctx.scale(this.size / 15, this.size / 15);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-5, -5, -10, 0, 0, 10);
        ctx.bezierCurveTo(10, 0, 5, -5, 0, 0);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      const p = new HeartParticle();
      p.y = Math.random() * height; // initial spread
      particles.push(p);
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }

    animate();
  }
});
