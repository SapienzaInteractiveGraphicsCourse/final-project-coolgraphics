import { CAMERA_LABELS } from "../utils/constants.js";

export class UIController extends EventTarget {
  constructor(root) {
    super();
    this.root = root;
    this.visible = true;
    this.values = {
      camera: CAMERA_LABELS.thirdPerson,
      lights: "Main Lighting",
      shadows: "on",
      quality: "medium"
    };
    this.render();
  }

  render() {
    this.root.innerHTML = "";
    this.panel =document.createElement("section");
    this.panel.className = "museum-panel";
    this.panel.innerHTML = `
      <header class="museum-panel-header">
        <h1>Night at the Museum</h1>
      </header>
      <div class="museum-grid">
        <div class="museum-row museum-section-row"><span class="museum-key">Controls</span><span class="museum-value"></span></div>
        <div class="museum-row"><span class="museum-key">W / S</span><span class="museum-value">Forward / Backward</span></div>
        <div class="museum-row"><span class="museum-key">A / D</span><span class="museum-value">Turn</span></div>
        <div class="museum-row"><span class="museum-key">C</span><span class="museum-value">Change Viewpoint</span></div>
        <div class="museum-row"><span class="museum-key">H</span><span class="museum-value">Hide / Show menu</span></div>
        <div class="museum-row"><span class="museum-key">Mouse wheel</span><span class="museum-value">Zoom in / out</span></div>
        <div class="museum-row"><span class="museum-key">Mouse drag</span><span class="museum-value">Orbit camera</span></div>
        <div class="museum-row museum-section-row"><span class="museum-key">Status</span><span class="museum-value"></span></div>
        <div class="museum-row"><span class="museum-key">Camera</span><span data-field="camera" class="museum-value"></span></div>
        <div class="museum-row"><span class="museum-key">Lights</span><span data-field="lights" class="museum-value"></span></div>
      </div>
      <div class="museum-actions">
        <select class="museum-control" data-action="lightMode" aria-label="Lights">
          <option value="off">Secondary Lighting</option>
          <option value="day" selected>Main Lighting</option>
        </select>
        <button class="museum-control" data-action="shadows">Shadows</button>
        <select class="museum-control" data-action="quality" aria-label="Quality">
          <option value="low">Quality Low</option>
          <option value="medium" selected>Quality Medium</option>
          <option value="high">Quality High</option>
        </select>
      </div>
      <div class="museum-intensity" data-control="secondaryIntensity" hidden>
        <label for="secondary-intensity">Secondary intensity</label>
        <output for="secondary-intensity">100%</output>
        <input id="secondary-intensity" type="range" min="0" max="200" step="5" value="100" aria-label="Secondary light intensity">
      </div>
      <div class="museum-intensity" data-control="flashlightIntensity" hidden>
        <label for="flashlight-intensity">Flashlight intensity</label>
        <output for="flashlight-intensity">100%</output>
        <input id="flashlight-intensity" type="range" min="0" max="200" step="5" value="100" aria-label="Flashlight intensity">
      </div>
      <div class="museum-intensity" data-control="flashlightRange" hidden>
        <label for="flashlight-range">Flashlight range</label>
        <output for="flashlight-range">13</output>
        <input id="flashlight-range" type="range" min="5" max="30" step="1" value="13" aria-label="Flashlight range">
      </div>
      <section class="museum-wake-panel">
        <span class="museum-key">T</span>
        <span>Press T to wake the museum</span>
      </section>
    `;
    this.root.appendChild(this.panel);
    const lightModeSelect = this.panel.querySelector('[data-action="lightMode"]');
    const shadowButton = this.panel.querySelector('[data-action="shadows"]');
    const qualitySelect = this.panel.querySelector('[data-action="quality"]');

    lightModeSelect.addEventListener("change",event => {
      this.dispatchEvent(new CustomEvent("lightModeChanged",{ detail: event.target.value }));
    });
    shadowButton.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("toggleShadows"));
    });
    qualitySelect.addEventListener("change", event => {
      this.dispatchEvent(new CustomEvent("qualityChanged", { detail: event.target.value }));
    });

    const secondaryIntensity = this.panel.querySelector("#secondary-intensity");
    secondaryIntensity.addEventListener("input", event => {
      const percentage =Number(event.target.value);
      this.panel.querySelector('[data-control="secondaryIntensity"] output').value = `${percentage}%`;
      this.dispatchEvent(new CustomEvent("secondaryIntensityChanged", { detail: percentage/100 }));
    });
    const flashlightIntensity = this.panel.querySelector("#flashlight-intensity");
    flashlightIntensity.addEventListener("input", event => {
      const percentage = Number(event.target.value);
      this.panel.querySelector('[data-control="flashlightIntensity"] output').value = `${percentage}%`;
      this.dispatchEvent(new CustomEvent("flashlightIntensityChanged", { detail: percentage / 100 }));
    });
    const flashlightRange = this.panel.querySelector("#flashlight-range");
    flashlightRange.addEventListener("input", event => {
      const distance = Number(event.target.value);
      this.panel.querySelector('[data-control="flashlightRange"] output').value = String(distance);
      this.dispatchEvent(new CustomEvent("flashlightRangeChanged", { detail: distance }));
    });
    this.refresh();
  }

  setCamera(label) {
    this.values.camera = label;
    this.refresh();
  }

  setVisible(visible) {
    this.visible = visible;
    this.root.hidden = !visible;
  }

  toggleVisible() {
    this.setVisible(!this.visible);
  }

  setLightMode(mode) {
    const labels = {
      off: "Secondary Lighting",
      day: "Main Lighting"
    };
    this.values.lights = labels[mode] ?? labels.day;
    this.panel.querySelector('[data-action="lightMode"]').value = mode;
    this.panel.querySelector('[data-control="secondaryIntensity"]').hidden = mode!=="off";
    this.panel.querySelector('[data-control="flashlightIntensity"]').hidden = mode !== "off";
    this.panel.querySelector('[data-control="flashlightRange"]').hidden = mode !== "off";
    this.refresh();
  }

  setShadows(enabled) {
    this.values.shadows = enabled ? "on": "off";
    this.panel.querySelector('[data-action="shadows"]').textContent = `Shadows ${this.values.shadows}`;
  }

  refresh() {
    this.panel.querySelector('[data-field="camera"]').textContent = this.values.camera;
    this.panel.querySelector('[data-field="lights"]').textContent = this.values.lights;
    this.panel.querySelector('[data-action="shadows"]').textContent = `Shadows ${this.values.shadows}`;
  }
}
