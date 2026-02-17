/**
 * Custom PIXI Filter for Vision Blurring
 */
export class VisionBlurFilter extends PIXI.Filter {
    constructor(vertex, fragment) {
        super(vertex, fragment);
        this.uniforms.uTokenPos = new Float32Array(20); // 10 tokens * 2 coordinates
        this.uniforms.uDistance = new Float32Array(10); // 10 tokens * 1 distance
        this.uniforms.uTokenCount = 0;
        this.uniforms.uBlurStrength = 2.0;
        this.uniforms.uResolution = [window.innerWidth, window.innerHeight];
    }

    /**
     * Update the filter settings
     * @param {Object} data - { tokens: [{x, y, range}], blur }
     */
    update(data) {
        if (data.tokens) {
            let count = 0;
            for (const t of data.tokens) {
                if (count >= 10) break;
                // Flat array for vec2: [x0, y0, x1, y1, ...]
                this.uniforms.uTokenPos[count * 2] = t.pos[0];
                this.uniforms.uTokenPos[count * 2 + 1] = t.pos[1];
                this.uniforms.uDistance[count] = t.range;
                count++;
            }
            this.uniforms.uTokenCount = count;
        }

        if (data.blur !== undefined) this.uniforms.uBlurStrength = data.blur;
        this.uniforms.uResolution = [canvas.app.renderer.width, canvas.app.renderer.height];
    }
}
