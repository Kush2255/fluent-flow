// SpeakAssist Content Script - Injects floating orb into meeting pages

(function() {
  "use strict";

  // Prevent double injection
  if (window.__speakAssistInjected) return;
  window.__speakAssistInjected = true;

  // State
  let isListening = false;
  let recognition = null;
  let currentResponse = null;
  let conversationHistory = [];
  let lastProcessedTranscript = "";
  let settings = { responseStyle: "neutral", language: "en" };
  let orbElement = null;
  let panelElement = null;

  // Load settings
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
    if (response) settings = response;
  });

  // Create and inject the floating orb
  function createOrb() {
    // Main container
    const container = document.createElement("div");
    container.id = "speakassist-container";
    container.innerHTML = `
      <div id="speakassist-orb" class="speakassist-orb">
        <div class="speakassist-orb-inner">
          <svg class="speakassist-mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </div>
        <div class="speakassist-pulse-ring"></div>
        <div class="speakassist-pulse-ring speakassist-pulse-ring-2"></div>
        <div class="speakassist-status-dot"></div>
      </div>
      
      <div id="speakassist-panel" class="speakassist-panel speakassist-hidden">
        <div class="speakassist-panel-header">
          <span class="speakassist-cue"></span>
          <div class="speakassist-opportunity">
            <span class="speakassist-opportunity-dot"></span>
            <span class="speakassist-opportunity-text"></span>
          </div>
        </div>
        <div class="speakassist-tags">
          <span class="speakassist-topic"></span>
          <span class="speakassist-mood"></span>
        </div>
        <div class="speakassist-suggestions"></div>
      </div>
      
      <div id="speakassist-interim" class="speakassist-interim speakassist-hidden">
        <p class="speakassist-interim-text"></p>
      </div>
    `;
    
    document.body.appendChild(container);
    
    orbElement = container.querySelector("#speakassist-orb");
    panelElement = container.querySelector("#speakassist-panel");
    
    // Make orb draggable
    makeDraggable(container);
    
    // Click handler
    orbElement.addEventListener("click", toggleListening);
    
    // Position in bottom-left
    container.style.left = "20px";
    container.style.bottom = "20px";
    
    return container;
  }

  // Make element draggable
  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    element.addEventListener("mousedown", (e) => {
      if (e.target.closest("#speakassist-panel")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = element.offsetLeft;
      initialY = element.offsetTop;
      element.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = `${initialX + dx}px`;
      element.style.top = `${initialY + dy}px`;
      element.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      element.style.cursor = "grab";
    });
  }

  // Toggle speech recognition
  async function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }

  // Start listening
  async function startListening() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("SpeakAssist: Speech recognition not supported");
        return;
      }

      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language === "en" ? "en-US" : settings.language;

      recognition.onresult = handleSpeechResult;
      recognition.onerror = (e) => console.error("SpeakAssist: Speech error", e);
      recognition.onend = () => {
        if (isListening) recognition.start(); // Auto-restart
      };

      recognition.start();
      isListening = true;
      updateOrbState("listening");
      
    } catch (error) {
      console.error("SpeakAssist: Microphone access denied", error);
      updateOrbState("error");
    }
  }

  // Stop listening
  function stopListening() {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    isListening = false;
    lastProcessedTranscript = "";
    conversationHistory = [];
    currentResponse = null;
    updateOrbState("idle");
    hidePanel();
  }

  // Handle speech results
  let fullTranscript = "";
  function handleSpeechResult(event) {
    let interimTranscript = "";
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        fullTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }

    // Show interim
    if (interimTranscript) {
      showInterim(interimTranscript);
    }

    // Process when we have new content
    const newContent = fullTranscript.slice(lastProcessedTranscript.length).trim();
    if (newContent.length > 10 && fullTranscript !== lastProcessedTranscript) {
      lastProcessedTranscript = fullTranscript;
      hideInterim();
      processTranscript(newContent);
    }
  }

  // Process transcript and get AI response
  async function processTranscript(text) {
    updateOrbState("processing");
    
    const recentHistory = conversationHistory.slice(-3);
    
    chrome.runtime.sendMessage({
      type: "GENERATE_RESPONSE",
      data: {
        transcript: text,
        recentHistory,
        responseStyle: settings.responseStyle,
        language: settings.language,
      }
    }, (response) => {
      if (response && response.suggestions) {
        currentResponse = response;
        conversationHistory.push(text);
        if (conversationHistory.length > 5) {
          conversationHistory = conversationHistory.slice(-5);
        }
        showPanel(response);
        updateOrbState("suggesting");
        
        // Return to listening after delay
        setTimeout(() => {
          if (isListening) updateOrbState("listening");
        }, 6000);
      } else {
        updateOrbState("listening");
      }
    });
  }

  // Update orb visual state
  function updateOrbState(state) {
    if (!orbElement) return;
    
    orbElement.className = "speakassist-orb";
    orbElement.classList.add(`speakassist-orb--${state}`);
    
    const statusDot = orbElement.querySelector(".speakassist-status-dot");
    if (statusDot) {
      statusDot.className = "speakassist-status-dot";
      statusDot.classList.add(`speakassist-status-dot--${state}`);
    }
    
    const pulseRings = orbElement.querySelectorAll(".speakassist-pulse-ring");
    pulseRings.forEach(ring => {
      ring.style.display = state === "listening" ? "block" : "none";
    });
  }

  // Show suggestion panel
  function showPanel(response) {
    if (!panelElement) return;
    
    panelElement.querySelector(".speakassist-cue").textContent = response.assistive_cue;
    panelElement.querySelector(".speakassist-topic").textContent = response.topic;
    panelElement.querySelector(".speakassist-mood").textContent = response.group_mood;
    
    const opportunityDot = panelElement.querySelector(".speakassist-opportunity-dot");
    const opportunityText = panelElement.querySelector(".speakassist-opportunity-text");
    
    opportunityDot.className = `speakassist-opportunity-dot speakassist-opportunity-dot--${response.speaking_opportunity}`;
    opportunityText.textContent = response.speaking_opportunity;
    
    const suggestionsContainer = panelElement.querySelector(".speakassist-suggestions");
    suggestionsContainer.innerHTML = response.suggestions
      .map(s => `<div class="speakassist-suggestion" onclick="navigator.clipboard.writeText('${s.replace(/'/g, "\\'")}')">
        <p>${s}</p>
        <span class="speakassist-copy-hint">Click to copy</span>
      </div>`)
      .join("");
    
    panelElement.classList.remove("speakassist-hidden");
  }

  // Hide panel
  function hidePanel() {
    if (panelElement) {
      panelElement.classList.add("speakassist-hidden");
    }
  }

  // Show interim transcript
  function showInterim(text) {
    const interim = document.querySelector("#speakassist-interim");
    if (interim) {
      interim.querySelector(".speakassist-interim-text").textContent = text;
      interim.classList.remove("speakassist-hidden");
    }
  }

  // Hide interim
  function hideInterim() {
    const interim = document.querySelector("#speakassist-interim");
    if (interim) {
      interim.classList.add("speakassist-hidden");
    }
  }

  // Initialize
  function init() {
    // Wait for page to load
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", createOrb);
    } else {
      createOrb();
    }
    
    console.log("SpeakAssist: Content script loaded");
  }

  init();
})();
