precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec2 uTokenPos;      // Center of the token (0.0 to 1.0 UV coordinates)
uniform float uDistance;     // Vision range in UV coordinates
uniform float uBlurStrength; // blur strength
uniform vec2 uResolution;    // Screen resolution

const float GOLDEN_ANGLE = 2.39996323;
const float ITERATIONS = 40.0; // Higher = superior quality, more GPU usage

// Golden Angle Sampling for smooth, distinct "Bokeh" / Frosted look
vec4 bokehBlur(sampler2D sampler, vec2 uv, float strength) {
    vec4 color = vec4(0.0);
    float total = 0.0;
    
    // Adjust strength to valid range
    float radius = strength * 2.0; 

    // Aspect ratio correction for the blur circle
    float aspect = uResolution.x / uResolution.y;

    for (float i = 0.0; i < ITERATIONS; i++) {
        // sqrt(i) ensures uniform distribution of points
        float r = sqrt(i) * radius / uResolution.x;
        float theta = i * GOLDEN_ANGLE;
        
        vec2 offset = vec2(cos(theta), sin(theta)) * r;
        offset.y *= aspect; // Correct usage of aspect for circular blur 

        color += texture2D(sampler, uv + offset);
        total += 1.0;
    }
    return color / total;
}

void main() {
    // Correct aspect ratio for distance calculation
    vec2 aspectVec = uResolution / min(uResolution.x, uResolution.y);
    vec2 uvCorrected = vTextureCoord * aspectVec;
    vec2 posCorrected = uTokenPos * aspectVec;

    float dist = distance(uvCorrected, posCorrected);

    // Calculate blur factor: 0.0 inside range, smoothly transitions to 1.0 outside
    // Soft edge for the clear circle
    float edgeSoftness = 0.1; 
    float blurFactor = smoothstep(uDistance - edgeSoftness, uDistance + edgeSoftness, dist);

    vec4 originalColor = texture2D(uSampler, vTextureCoord);
    
    // Optimization: if blurFactor is very small, just return original color
    if (blurFactor < 0.01) {
        gl_FragColor = originalColor;
        return;
    }

    // Apply High Quality Blur
    vec4 blurredColor = bokehBlur(uSampler, vTextureCoord, uBlurStrength);

    // Mix original and blurred based on distance
    gl_FragColor = mix(originalColor, blurredColor, blurFactor);
}
