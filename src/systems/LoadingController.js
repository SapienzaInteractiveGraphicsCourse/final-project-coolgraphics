export class LoadingController {
  constructor(root) {
    this.root = root;
    this.total = 0;
    this.completed = 0;
    this.pending = new Set();
    this.errors = [];
    this.readyResolvers = [];

    this.progressBar = root.querySelector("[data-loading-bar]");
    this.progressValue = root.querySelector("[data-loading-value]");
    this.statusText = root.querySelector("[data-loading-status]");
    this.update();
  }

  track(promise) {
    const trackedPromise = Promise.resolve(promise);

    this.total += 1;
    this.pending.add(trackedPromise);
    this.update();

    trackedPromise
      .catch(error => {
        this.errors.push(error);
      })
      .finally(() => {
        this.completed += 1;
        this.pending.delete(trackedPromise);
        this.update();
        this.resolveIfReadySoon();
      });

    return trackedPromise;
  }

  waitForReady() {
    return new Promise((resolve, reject) => {
      this.readyResolvers.push({ resolve, reject });
      this.resolveIfReadySoon();
    });
  }

  resolveIfReadySoon() {
    window.setTimeout(() => {
      if (this.pending.size > 0) {
        return;
      }

      const resolvers = this.readyResolvers.splice(0);
      resolvers.forEach(({ resolve, reject }) => {
        if (this.errors.length > 0) {
          reject(this.errors[0]);
        } else {
          resolve();
        }
      });
    }, 0);
  }

  hide() {
    document.body.classList.remove("app-loading");
    this.root.classList.add("loading-screen-hidden");
    window.setTimeout(() => {
      this.root.hidden = true;
      this.root.style.display = "none";
    }, 360);
  }

  showError(error) {
    this.statusText.textContent = "Loading failed";
    this.root.classList.add("loading-screen-error");
    console.error("Failed to load the scene:", error);
  }

  update() {
    const progress = this.total === 0
      ? 0
      : Math.round((this.completed / this.total) * 100);

    this.progressBar.style.width = `${progress}%`;
    this.progressValue.textContent = `${progress}%`;
    this.statusText.textContent = this.total === 0
      ? "Preparing scene"
      : `Loading assets ${this.completed}/${this.total}`;
  }
}
