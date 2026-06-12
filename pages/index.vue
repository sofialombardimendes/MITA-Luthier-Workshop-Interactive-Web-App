<template>
  <div class="app-container">
    <!-- Hero Banner -->
    <header class="hero">
      <div class="hero-overlay">
        <h1>The Violin Workshop</h1>
        <p>Discover Cremona's ancient luthier tradition</p>
      </div>
    </header>

   <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

    <!-- IDLE state -->
    <div v-if="currentState === 'IDLE'">
      <!-- MOBILE: Camera interface -->
      <div v-if="isMobile" class="mobile-camera-ui">
        <div class="camera-section">
          <div class="camera-viewfinder" @click="triggerCamera">
            <img v-if="capturedImage" :src="capturedImage" class="captured-preview" />
            <div v-else class="camera-placeholder">
              <div class="camera-icon">📷</div>
              <p>Tap to open camera</p>
              <small>Point at a violin tool to identify it</small>
            </div>
            <input
              ref="cameraInput"
              type="file"
              accept="image/*"
              capture="environment"
              class="hidden-input"
              @change="handleCameraCapture"
            />
          </div>
          <!-- Loading -->
          <div v-if="isDetecting" class="detection-loading">
            <div class="spinner-small" /> Analyzing image...
          </div>

          <!-- Résultat -->
          <div v-else-if="detectedObject?.success" class="detection-result">
            🎻 This is a <strong>{{ detectedObject.text }}</strong>
          </div>
          <div v-else-if="detectedObject?.success === false" class="detection-error">
            ⚠️ Object not recognized. Please try again with a clearer image.
          </div>
          <button class="camera-btn" @click="triggerCamera">
            Take Photo
          </button>
        </div>

        <div class="divider">
          <span>or browse tools</span>
        </div>

        <!-- Fallback tap grid on mobile -->
        <ToolSelector :items="items" @select="sense" />
      </div>

      <!-- DESKTOP: Normal grid -->
      <ToolSelector v-else :items="items" @select="sense" />
    </div>

    <!-- SENSE / INTERPRET: loading -->
    <div v-if="currentState === 'SENSE' || currentState === 'INTERPRET'" class="loading-state">
      <div class="spinner" />
      <p>{{ stateLabel }}</p>
    </div>

    <!-- GROUND: disambiguation -->
    <DisambiguationPanel v-if="currentState === 'GROUND' && isAmbiguous && !selectedItem"
      :candidates="candidates" @select="selectCandidate" />

    <!-- GROUND: intent selection -->
    <IntentPanel v-if="currentState === 'GROUND' && selectedItem"
      :item="selectedItem" :intents="intents" @select="selectIntent" />

    <!-- ACT: result -->
    <ResultPanel v-if="currentState === 'ACT'"
      :item="selectedItem" :intent="selectedIntent" @repair="repair" @reset="reset" />

    <!-- Voice input -->
    <VoiceInput v-if="currentState !== 'IDLE'" @result="handleVoice" />

    <!-- History -->
    <aside v-if="history.length" class="history">
      <h4>Recent explorations</h4>
      <div v-for="(h, i) in history" :key="i" class="history-item">
        <strong>{{ h.item }}</strong> &mdash; {{ h.intent }}
        <small>{{ h.time }}</small>
      </div>
    </aside>

    <div class="tour-link"><NuxtLink to="/tour" class="tour-btn">🎻 Take the Guided Tour</NuxtLink></div><footer class="app-footer">
      <p>MITA</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGroundingLoop } from '~/composables/useGroundingLoop'

const {
  currentState, candidates,
  selectedItem, selectedIntent,
  errorMessage, history,
  items, intents,
  stateLabel, isAmbiguous,
  sense, selectCandidate,
  selectIntent, repair, reset
} = useGroundingLoop()

// Mobile detection
const isMobile = ref(false)
const capturedImage = ref(null)
const cameraInput = ref(null)
const isDetecting = ref(false)
const detectedObject = ref(null)

onMounted(() => {
  isMobile.value = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    || window.innerWidth < 768 || true
})

function triggerCamera() {
  cameraInput.value?.click()
}

async function handleCameraCapture(event) {
  console.log('📸 Photo capturée !')
  const file = event.target.files[0]
  if (!file) {
    console.log('❌ Pas de fichier')
    return
  }
  console.log('✅ Fichier:', file.name, file.type, file.size)

  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = async (e) => {
  capturedImage.value = e.target.result
  isDetecting.value = true
  detectedObject.value = null

  try {
    const base64 = e.target.result.split(',')[1]
    const response = await $fetch('/api/detect', {
    method: 'POST',
    body: { image: base64 }
  })

  const top = response.top
  const confidence = response.confidence
  console.log("Le top c'est : ", confidence);

  if (top) {
    detectedObject.value = { success: true, text: `${top} (${Math.round(confidence * 100)}%)` }
  } else {
    detectedObject.value = { success: false }
  }
    } catch (error) {
      detectedObject.value = { success: false }
    } finally {
      isDetecting.value = false
    }
  }

  reader.onerror = (e) => {
    console.error('❌ Erreur lecture fichier:', e)
  }
}

function handleVoice(text) {
  const lower = text.toLowerCase()
  if (currentState.value === 'GROUND' && isAmbiguous.value && !selectedItem.value) {
    const match = candidates.value.find(c => lower.includes(c.name.toLowerCase()))
    if (match) selectCandidate(match.id)
  } else if (currentState.value === 'GROUND' && selectedItem.value) {
    if (lower.includes('use')) selectIntent('function')
    else if (lower.includes('sound')) selectIntent('sound')
    else if (lower.includes('history')) selectIntent('history')
    else if (lower.includes('compare')) selectIntent('compare')
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', sans-serif;
  background: #f5f0eb;
  color: #2c1810;
}

/* Hero */
.hero {
  width: 100%;
  height: 280px;
  background: linear-gradient(135deg, #2c1810 0%, #8B4513 50%, #c8860a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-overlay {
  text-align: center;
  color: white;
  padding: 20px;
}

.hero-overlay h1 {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 10px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.hero-overlay p {
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0.9;
}

/* Main container */
.app-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 0 40px;
}

.loop-wrapper {
  background: white;
  padding: 16px 20px 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.state-label {
  text-align: center;
  color: #8B4513;
  font-weight: 500;
  margin: 20px 0 8px;
  font-size: 15px;
}

.error-msg {
  text-align: center;
  color: #c0392b;
  background: #fdf0ed;
  padding: 10px 20px;
  border-radius: 8px;
  margin: 12px 20px;
  border-left: 4px solid #c0392b;
}

.loading-state {
  text-align: center;
  padding: 80px 20px;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid #e8d5c0;
  border-top-color: #8B4513;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Mobile camera UI */
.mobile-camera-ui {
  padding: 24px 20px;
}

.camera-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.camera-viewfinder {
  width: 100%;
  max-width: 340px;
  height: 260px;
  border-radius: 20px;
  border: 3px dashed #8B4513;
  background: #2c1810;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s;
}

.camera-viewfinder:hover {
  border-color: #c8860a;
}

.camera-placeholder {
  text-align: center;
  color: white;
  padding: 20px;
}

.camera-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.camera-placeholder p {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 6px;
}

.camera-placeholder small {
  font-size: 12px;
  opacity: 0.7;
}

.captured-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hidden-input {
  display: none;
}

.camera-btn {
  background: #8B4513;
  color: white;
  border: none;
  padding: 14px 40px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: background 0.2s;
}

.camera-btn:hover {
  background: #6d3410;
}

.divider {
  text-align: center;
  color: #999;
  font-size: 13px;
  margin: 8px 0 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #ddd;
}

/* History */
.history {
  margin: 40px 20px 0;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border-top: 3px solid #8B4513;
}

.history h4 {
  margin-bottom: 12px;
  color: #8B4513;
  font-family: 'Playfair Display', serif;
  font-size: 16px;
}

.history-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0e8e0;
  font-size: 14px;
  color: #555;
}

.history-item small {
  display: block;
  color: #999;
  font-size: 12px;
  margin-top: 2px;
}

/* Footer */
.app-footer {
  text-align: center;
  margin-top: 48px;
  padding: 20px;
  color: #999;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-top: 1px solid #e0d5c8;
}

.detection-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: white;
  border-radius: 12px;
  font-size: 15px;
  color: #8B4513;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e8d5c0;
  border-top-color: #8B4513;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.detection-result {
  padding: 14px 20px;
  background: white;
  border-radius: 12px;
  border-left: 4px solid #8B4513;
  font-size: 16px;
  text-align: center;
  color: #2c1810;
}

.detection-error {
  padding: 14px 20px;
  background: #fdf0ed;
  border-radius: 12px;
  border-left: 4px solid #c0392b;
  font-size: 15px;
  text-align: center;
  color: #c0392b;
}


/* Mobile responsive */
@media (max-width: 768px) {
  .hero { height: 200px; }
  .hero-overlay h1 { font-size: 32px; }
  .hero-overlay p { font-size: 13px; }
  .app-container { padding-bottom: 60px; }
}
</style>
<style>
.tour-link { text-align: center; margin: 32px 20px 0; }
.tour-btn { display: inline-block; background: #2c1810; color: white; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-size: 15px; font-weight: 600; transition: background 0.2s; }
.tour-btn:hover { background: #8B4513; }
</style>
