export class Viewport {
  centerX = 0;
  centerY = 0;
  zoom = 0.5;
  canvasWidth = 800;
  canvasHeight = 600;

  worldToScreen(wx: number, wy: number): [number, number] {
    return [
      (wx - this.centerX) * this.zoom + this.canvasWidth / 2,
      (wy - this.centerY) * this.zoom + this.canvasHeight / 2,
    ];
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    return [
      (sx - this.canvasWidth / 2) / this.zoom + this.centerX,
      (sy - this.canvasHeight / 2) / this.zoom + this.centerY,
    ];
  }

  applyTransform(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(
      this.zoom, 0, 0, this.zoom,
      this.canvasWidth / 2 - this.centerX * this.zoom,
      this.canvasHeight / 2 - this.centerY * this.zoom,
    );
  }

  resetTransform(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  zoomAt(screenX: number, screenY: number, delta: number) {
    const [wx, wy] = this.screenToWorld(screenX, screenY);
    const factor = delta > 0 ? 0.9 : 1.1;
    this.zoom = Math.max(0.02, Math.min(6.0, this.zoom * factor));
    this.centerX = wx - (screenX - this.canvasWidth / 2) / this.zoom;
    this.centerY = wy - (screenY - this.canvasHeight / 2) / this.zoom;
  }

  fitBounds(minX: number, minY: number, maxX: number, maxY: number) {
    this.centerX = (minX + maxX) / 2;
    this.centerY = (minY + maxY) / 2;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    this.zoom = Math.min(this.canvasWidth / rangeX, this.canvasHeight / rangeY) * 0.85;
  }

  getVisibleBounds(margin: number = 200): { minX: number; minY: number; maxX: number; maxY: number } {
    const halfW = this.canvasWidth / 2 / this.zoom + margin;
    const halfH = this.canvasHeight / 2 / this.zoom + margin;
    return {
      minX: this.centerX - halfW,
      maxX: this.centerX + halfW,
      minY: this.centerY - halfH,
      maxY: this.centerY + halfH,
    };
  }
}
