/**
 * Custom PIXI Filter for Vision Blurring
 */
export class VisionBlurFilter extends PIXI.Filter {
    constructor(vertex, fragment) {
        super(vertex, fragment);
        this.uniforms.uTokenPos = [0.5, 0.5];
        this.uniforms.uDistance = 0.3;
        this.uniforms.uBlurStrength = 2.0;
        this.uniforms.uResolution = [window.innerWidth, window.innerHeight];
    }

    /**
     * Update the filter settings
     * @param {Object} data - { x, y, range, blur }
     */
    update(data) {
        // Convert world coordinates to screen UV coordinates (0-1)
        // This requires access to the canvas transform, which we handle in main.js usually, 
        // but here we just accept UVs or World Coords? 
        // Let's pass normalized UVs from main.js for simplicity.
        if (data.pos) this.uniforms.uTokenPos = data.pos;
        if (data.range !== undefined) this.uniforms.uDistance = data.range;
        if (data.blur !== undefined) this.uniforms.uBlurStrength = data.blur;
        this.uniforms.uResolution = [canvas.app.renderer.width, canvas.app.renderer.height];
    }
}
