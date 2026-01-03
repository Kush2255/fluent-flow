// SpeakAssist Content Script - Compact popup with all info

(function() {
  "use strict";

  if (window.__speakAssistInjected) return;
  window.__speakAssistInjected = true;

  // State
  let isListening = false;
  let recognition = null;
  let currentResponse = null;
  let conversationHistory = [];
  let lastProcessedTranscript = "";
  let settings = { responseStyle: "neutral", language: "en" };
  let isExpanded = false;

  // Load settings
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
    if (response) settings = response;
  });

  // Create the floating widget
  function createWidget() {
    const container = document.createElement("div");
    container.id = "speakassist-widget";
    container.innerHTML = `
      <div id="speakassist-orb">
        <svg class="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <div class="pulse-ring"></div>
        <div class="pulse-ring delay"></div>
        <div class="status-dot"></div>
        <div class="spinner"></div>
      </div>
      
      <div id="speakassist-popup" class="hidden">
        <div class="popup-header">
          <span class="popup-title">SpeakAssist</span>
          <button class="close-btn">&times;</button>
        </div>
        
        <div class="popup-section transcript-section hidden">
          <div class="section-label">Live Transcript</div>
          <div class="transcript-text"></div>
        </div>
        
        <div class="popup-section analysis-section hidden">
          <div class="analysis-header">
            <span class="cue-badge"></span>
            <div class="opportunity">
              <span class="opp-dot"></span>
              <span class="opp-text"></span>
            </div>
          </div>
          
          <div class="analysis-tags">
            <span class="tag topic-tag"></span>
            <span class="tag mood-tag"></span>
            <span class="tag intent-tag"></span>
          </div>
        </div>
        
        <div class="popup-section suggestions-section hidden">
          <div class="section-label">Suggestions</div>
          <div class="suggestions-list"></div>
        </div>
        
        <div class="popup-section idle-section">
          <div class="idle-message">
            <svg class="idle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            </svg>
            <p>Click the orb to start listening</p>
          </div>
        </div>
        
        <div class="popup-footer">
          <span class="status-text">Ready</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Make draggable
    makeDraggable(container);
    
    // Event listeners
    container.querySelector("#speakassist-orb").addEventListener("click", handleOrbClick);
    container.querySelector(".close-btn").addEventListener("click", () => togglePopup(false));
    
    // Position bottom-right
    container.style.right = "20px";
    container.style.bottom = "20px";
    
    return container;
  }

  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialRight, initialBottom;
    const orb = element.querySelector("#speakassist-orb");

    orb.addEventListener("mousedown", (e) => {
      if (e.target.closest("#speakassist-popup")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialRight = parseInt(element.style.right) || 20;
      initialBottom = parseInt(element.style.bottom) || 20;
      element.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = startX - e.clientX;
      const dy = startY - e.clientY;
      element.style.right = `${initialRight + dx}px`;
      element.style.bottom = `${initialBottom + dy}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      element.style.cursor = "";
    });
  }

  function handleOrbClick(e) {
    if (e.detail === 1) {
      // Single click - toggle listening
      setTimeout(() => {
        if (!isExpanded) toggleListening();
      }, 200);
    }
  }

  // Double click to toggle popup
  document.addEventListener("dblclick", (e) => {
    if (e.target.closest("#speakassist-orb")) {
      togglePopup(!isExpanded);
    }
  });

  function togglePopup(show) {
    const popup = document.querySelector("#speakassist-popup");
    if (show) {
      popup.classList.remove("hidden");
      isExpanded = true;
    } else {
      popup.classList.add("hidden");
      isExpanded = false;
    }
  }

  async function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
      togglePopup(true);
    }
  }

  async function startListening() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        updateStatus("Speech not supported", "error");
        return;
      }

      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language === "en" ? "en-US" : settings.language;

      recognition.onresult = handleSpeechResult;
      recognition.onerror = (e) => {
        console.error("Speech error:", e);
        updateStatus("Speech error", "error");
      };
      recognition.onend = () => {
        if (isListening) recognition.start();
      };

      recognition.start();
      isListening = true;
      updateOrbState("listening");
      updateStatus("Listening...");
      showSection("idle", false);
      
    } catch (error) {
      console.error("Mic access denied:", error);
      updateOrbState("error");
      updateStatus("Mic access denied", "error");
    }
  }

  function stopListening() {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    isListening = false;
    lastProcessedTranscript = "";
    conversationHistory = [];
    currentResponse = null;
    fullTranscript = "";
    
    updateOrbState("idle");
    updateStatus("Ready");
    showSection("transcript", false);
    showSection("analysis", false);
    showSection("suggestions", false);
    showSection("idle", true);
  }

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

    // Update transcript display
    const display = fullTranscript + (interimTranscript ? `<span class="interim">${interimTranscript}</span>` : "");
    if (display.trim()) {
      showSection("transcript", true);
      document.querySelector(".transcript-text").innerHTML = display;
    }

    // Process when we have new content
    const newContent = fullTranscript.slice(lastProcessedTranscript.length).trim();
    if (newContent.length > 10 && fullTranscript !== lastProcessedTranscript) {
      lastProcessedTranscript = fullTranscript;
      processTranscript(newContent);
    }
  }

  async function processTranscript(text) {
    updateOrbState("processing");
    updateStatus("Analyzing...");
    
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
        displayResponse(response);
        updateOrbState("suggesting");
        updateStatus("Suggestions ready");
        
        setTimeout(() => {
          if (isListening) {
            updateOrbState("listening");
            updateStatus("Listening...");
          }
        }, 5000);
      } else {
        updateOrbState("listening");
        updateStatus("Listening...");
      }
    });
  }

  function displayResponse(response) {
    showSection("idle", false);
    showSection("analysis", true);
    showSection("suggestions", true);
    
    // Analysis header
    document.querySelector(".cue-badge").textContent = response.assistive_cue;
    document.querySelector(".opp-dot").className = `opp-dot opp-${response.speaking_opportunity}`;
    document.querySelector(".opp-text").textContent = response.speaking_opportunity;
    
    // Tags
    document.querySelector(".topic-tag").textContent = response.topic;
    document.querySelector(".mood-tag").textContent = response.group_mood;
    document.querySelector(".intent-tag").textContent = response.intent;
    
    // Suggestions
    const suggestionsHtml = response.suggestions
      .map(s => `<div class="suggestion" data-text="${s.replace(/"/g, '&quot;')}">
        <p>${s}</p>
        <span class="copy-hint">Click to copy</span>
      </div>`)
      .join("");
    
    document.querySelector(".suggestions-list").innerHTML = suggestionsHtml;
    
    // Add click handlers
    document.querySelectorAll(".suggestion").forEach(el => {
      el.addEventListener("click", () => {
        navigator.clipboard.writeText(el.dataset.text);
        el.classList.add("copied");
        setTimeout(() => el.classList.remove("copied"), 1500);
      });
    });
  }

  function showSection(name, show) {
    const section = document.querySelector(`.${name}-section`);
    if (section) {
      section.classList.toggle("hidden", !show);
    }
  }

  function updateOrbState(state) {
    const orb = document.querySelector("#speakassist-orb");
    if (!orb) return;
    
    orb.className = "";
    orb.classList.add(state);
  }

  function updateStatus(text, type = "normal") {
    const status = document.querySelector(".status-text");
    if (status) {
      status.textContent = text;
      status.className = `status-text ${type}`;
    }
  }

  // Initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
  
  console.log("SpeakAssist: Loaded");
})();
