/**
 * Custom PIXI Filter for Vision Blurring
 */
export class VisionBlurFilter extends foundry.canvas.rendering.filters.AbstractBaseFilter {
    static _createFragmentShader() {
        return `precision mediump float;

// Max supported tokens to track simultaneously
const int MAX_TOKENS = 10;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

uniform vec2 uTokenPos[MAX_TOKENS];      // Array of token centers
uniform float uDistance[MAX_TOKENS];     // Array of vision ranges
uniform int uTokenCount;                 // Number of active tokens
uniform float uBlurStrength;             // blur strength
uniform vec2 uResolution;                // Screen resolution

const float GOLDEN_ANGLE = 2.39996323;
const float ITERATIONS = 40.0; 

// Golden Angle Sampling for smooth, distinct "Bokeh" / Frosted look
vec4 bokehBlur(sampler2D sampler, vec2 uv, float strength) {
    vec4 color = vec4(0.0);
    float total = 0.0;
    
    float radius = strength * 2.0; 

    // Aspect ratio correction for the blur circle
    float aspect = uResolution.x / uResolution.y;

    for (float i = 0.0; i < ITERATIONS; i++) {
        float r = sqrt(i) * radius / uResolution.x;
        float theta = i * GOLDEN_ANGLE;
        
        vec2 offset = vec2(cos(theta), sin(theta)) * r;
        offset.y *= aspect; 

        color += texture2D(sampler, uv + offset);
        total += 1.0;
    }
    return color / total;
}

void main() {
    // Correct aspect ratio for distance calculation
    vec2 aspectVec = uResolution / min(uResolution.x, uResolution.y);
    vec2 uvCorrected = vTextureCoord * aspectVec;

    // Calculate minimum blur factor across all tokens (Union of Vision)
    // Default is 1.0 (Full Blur) if no tokens
    float minBlurFactor = 1.0;

    // Soft edge for the clear circle
    float edgeSoftness = 0.1; 

    for (int i = 0; i < MAX_TOKENS; i++) {
        if (i >= uTokenCount) break;

        vec2 posCorrected = uTokenPos[i] * aspectVec;
        float dist = distance(uvCorrected, posCorrected);
        
        // Calculate factor for this token: 0.0 (Clear) inside, 1.0 (Blurred) outside
        float factor = smoothstep(uDistance[i] - edgeSoftness, uDistance[i] + edgeSoftness, dist);
        
        // Take the clearest value (Union of clear areas)
        minBlurFactor = min(minBlurFactor, factor);
    }

    vec4 originalColor = texture2D(uSampler, vTextureCoord);
    
    // Optimization: if clear enough, skip blur
    if (minBlurFactor < 0.01) {
        gl_FragColor = originalColor;
        return;
    }

    // Apply High Quality Blur
    vec4 blurredColor = bokehBlur(uSampler, vTextureCoord, uBlurStrength);

    // Mix original and blurred based on distance
    gl_FragColor = mix(originalColor, blurredColor, minBlurFactor);
}`;
    }

    static get defaultUniforms() {
        return {
            uTokenPos: new Float32Array(20),
            uDistance: new Float32Array(10),
            uTokenCount: 0,
            uBlurStrength: 2.0,
            uResolution: [window.innerWidth, window.innerHeight]
        };
    }

    constructor(...args) {
        super(...args);
        this._tokenPosScratch = new Float32Array(20);
        this._distanceScratch = new Float32Array(10);
    }

    /**
     * Update the filter settings
     * @param {Object} data - { tokens: [{pos: [x,y], range}], blur }
     */
    update(data) {
        if (data.tokens) {
            this._tokenPosScratch.fill(0);
            this._distanceScratch.fill(0);
            let count = 0;
            for (const t of data.tokens) {
                if (count >= 10) break;
                // Flat array for vec2: [x0, y0, x1, y1, ...]
                this._tokenPosScratch[count * 2] = t.pos[0];
                this._tokenPosScratch[count * 2 + 1] = t.pos[1];
                this._distanceScratch[count] = t.range;
                count++;
            }
            this.uniforms.uTokenPos = this._tokenPosScratch;
            this.uniforms.uDistance = this._distanceScratch;
            this.uniforms.uTokenCount = count;
        }

        if (data.blur !== undefined) this.uniforms.uBlurStrength = data.blur;
        const renderer = canvas?.app?.renderer;
        const width = renderer?.screen?.width ?? renderer?.width ?? window.innerWidth;
        const height = renderer?.screen?.height ?? renderer?.height ?? window.innerHeight;
        this.uniforms.uResolution = [width, height];
    }
}
