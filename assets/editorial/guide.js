(function(){"use strict";var reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* ── 누리 가이드: 말할 때 타이핑 + 표정 애니메이션 ── */
  var guide = document.getElementById("guide"),
      bubble = document.getElementById("gBubble"),
      gText = document.getElementById("gText"),
      gLayoutText = document.getElementById("gLayoutText"),
      gCaret = document.getElementById("gCaret"),
      gAvatar = document.getElementById("gAvatar"),
      gReopen = document.getElementById("gReopen"),
      sections = Array.prototype.slice.call(document.querySelectorAll("[data-guide]")),
      current = "", typeTimer = null,
      gMotion = document.getElementById("gMotion"),
      gRender = document.getElementById("gRender"), paint = gRender.getContext("2d"),
      animationReady = gMotion.complete && gMotion.naturalWidth > 0,
      frameTimer = null, frameToken = 0, animationState = "", speechSequence = 0, animatedSpeech = -1,
      speaking = false, speechAllowsMotion = false, speechStartedAt = 0,
      typingComplete = false, talkEndTimer = null;

  function showFrame(frame) {
    // Keep the complete silhouette pixel-identical; replace only a local facial region.
    if (animationReady) {
      paint.clearRect(0, 0, 384, 512);
      paint.drawImage(gMotion, 0, 0, 384, 512, 0, 0, 384, 512);
      if (frame !== 0) {
        paint.save(); paint.beginPath();
        if (frame >= 4) paint.ellipse(131, 267, 46, 24, 0, 0, Math.PI * 2);
        else paint.rect(61, 146, 188, 83);
        paint.clip();
        paint.clearRect(0, 0, 384, 512);
        paint.drawImage(gMotion, (frame % 4) * 384, Math.floor(frame / 4) * 512, 384, 512, 0, 0, 384, 512);
        paint.restore();
      }
    }
    gMotion.dataset.frame = frame;
  }
  function startFrames(state) {
    clearTimeout(frameTimer);
    var token = ++frameToken, position = 0;
    var frames = state === "talking" ? [4, 5, 7, 6, 4, 7] : [0, 1, 2, 3];
    var durations = state === "talking" ? [180, 170, 130, 190, 140, 150] : [3400, 90, 120, 90];
    if (state === "still") { showFrame(0); return; }
    function next() {
      if (token !== frameToken) return;
      showFrame(frames[position]);
      var delay = durations[position];
      position = (position + 1) % frames.length;
      frameTimer = setTimeout(next, delay);
    }
    next();
  }
  function syncGuideAnimation() {
    var visible = !guide.classList.contains("closed") && !document.hidden;
    var talking = speaking && speechAllowsMotion && visible && animationReady;
    var state = talking ? "talking" : (visible && !reduceMotion && animationReady ? "idle" : "still");
    if (state !== animationState || (talking && animatedSpeech !== speechSequence)) {
      animationState = state;
      animatedSpeech = speechSequence;
      startFrames(state);
    }
    gMotion.dataset.motionState = state;
    gAvatar.classList.toggle("talking", talking);
    if (talking && !speechStartedAt) {
      speechStartedAt = performance.now();
      if (typingComplete) scheduleTalkEnd();
    }
  }
  function scheduleTalkEnd() {
    clearTimeout(talkEndTimer);
    if (!speaking) return;
    var elapsed = speechStartedAt ? performance.now() - speechStartedAt : 0;
    // Keep the talking expression visible; time spent loading the sprite does not count.
    var delay = speechStartedAt ? Math.max(700, 4500 - elapsed) : 15000;
    talkEndTimer = setTimeout(function () { setTalking(false); }, delay);
  }
  function setTalking(on) {
    clearTimeout(talkEndTimer);
    speaking = !!on;
    speechAllowsMotion = speaking;
    if (speaking) {
      speechStartedAt = 0;
      gMotion.dataset.speechId = ++speechSequence;
    }
    syncGuideAnimation();
  }
  gMotion.addEventListener("load", function () { animationReady = true; animationState = ""; syncGuideAnimation(); });
  gMotion.addEventListener("error", function () { animationReady = false; setTalking(false); });
  document.addEventListener("visibilitychange", syncGuideAnimation);
  syncGuideAnimation();

  function say(text, force) {
    if (text === current && !force) return;
    current = text;
    gLayoutText.textContent = text;
    clearInterval(typeTimer);
    setTalking(false);
    typingComplete = false;
    if (guide.classList.contains("closed")) {
      gText.textContent = text; gCaret.style.display = "none"; typingComplete = true;
      return;
    }
    // Keep the owner's typing presentation in both motion settings; ambient motion stays reduced.
    /* 새 안내마다 입 모양을 첫 프레임부터 재생한다. */
    setTalking(true);
    gCaret.style.display = "";
    gText.textContent = "";
    var i = 0;
    typeTimer = setInterval(function () {
      i++;
      gText.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(typeTimer);
        gCaret.style.display = "none";
        typingComplete = true;
        scheduleTalkEnd();
      }
    }, 26);
  }
  var sObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) say(e.target.getAttribute("data-guide"), false);
    });
  }, { rootMargin: "-38% 0px -52% 0px" });
  sections.forEach(function (s) { sObs.observe(s); });
  if (sections.length) say(sections[0].getAttribute("data-guide"), true);

  function visibleGuideText() {
    var focusY = window.innerHeight * 0.45, best = Infinity, bestHeight = Infinity, active = sections[0];
    sections.forEach(function (section) {
      if (!section.getClientRects().length) return;
      var rect = section.getBoundingClientRect();
      var distance = focusY < rect.top ? rect.top - focusY : (focusY > rect.bottom ? focusY - rect.bottom : 0);
      if (distance < best || (distance === best && rect.height < bestHeight)) { best = distance; bestHeight = rect.height; active = section; }
    });
    return active ? active.getAttribute("data-guide") : current;
  }
  gAvatar.addEventListener("click", function () {
    clearInterval(typeTimer);
    setTalking(false);
    guide.classList.add("closed");
    bubble.hidden = true;
    gAvatar.setAttribute("aria-expanded", "false");
    syncGuideAnimation();
    gReopen.focus({ preventScroll:true });
  });
  gReopen.addEventListener("click", function () {
    guide.classList.remove("closed");
    bubble.hidden = false;
    gAvatar.setAttribute("aria-expanded", "true");
    say(visibleGuideText(), true);
    gAvatar.focus({ preventScroll:true });
  });
})();
