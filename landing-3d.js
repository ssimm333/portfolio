// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded.');
        return;
    }

    // ==========================================
    // Artifact 1: Background Particle Network
    // ==========================================
    const bgCanvas = document.getElementById('bg-scene');
    if (bgCanvas) {
        initBackgroundScene(bgCanvas);
    }

    // ==========================================
    // Artifact 2: Interactive Geometric Centerpiece
    // ==========================================
    const graphicCanvas = document.getElementById('graphic-scene');
    if (graphicCanvas) {
        initGraphicScene(graphicCanvas);
    }
});

// ------------------------------------------------------------------
// Background Scene Implementation
// ------------------------------------------------------------------
function initBackgroundScene(canvas) {
    const scene = new THREE.Scene();
    
    // We want the background to be transparent so the CSS background shows through
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 200;

    // Create particles
    const particleCount = 150;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    const spread = 400;

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * spread;     // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * spread; // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread; // z

        velocities.push({
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
        });
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Material for particles
    const pMaterial = new THREE.PointsMaterial({
        color: 0x888888, // Subtle grey
        size: 1.5,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
    });

    const particleSystem = new THREE.Points(particles, pMaterial);
    scene.add(particleSystem);

    // Lines to connect nearby particles
    const linesMaterial = new THREE.LineBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.15
    });
    
    // We will update line geometry every frame
    const lineGeometry = new THREE.BufferGeometry();
    const linesMesh = new THREE.LineSegments(lineGeometry, linesMaterial);
    scene.add(linesMesh);

    // Mouse interaction variables
    let mouseX = 0;
    let mouseY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX) * 0.05;
        mouseY = (event.clientY - windowHalfY) * 0.05;
    });

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Slowly rotate whole system
        particleSystem.rotation.y += 0.0005;
        particleSystem.rotation.x += 0.0002;
        linesMesh.rotation.y = particleSystem.rotation.y;
        linesMesh.rotation.x = particleSystem.rotation.x;

        // Camera gentle follow mouse
        camera.position.x += (mouseX - camera.position.x) * 0.02;
        camera.position.y += (-mouseY - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        // Move particles
        const posAttribute = particles.getAttribute('position');
        const posArray = posAttribute.array;
        
        // Rebuild lines based on distance
        const linePositions = [];

        for (let i = 0; i < particleCount; i++) {
            // Update position
            posArray[i * 3] += velocities[i].x;
            posArray[i * 3 + 1] += velocities[i].y;
            posArray[i * 3 + 2] += velocities[i].z;

            // Simple bounce bounds
            if (Math.abs(posArray[i * 3]) > spread / 2) velocities[i].x *= -1;
            if (Math.abs(posArray[i * 3 + 1]) > spread / 2) velocities[i].y *= -1;
            if (Math.abs(posArray[i * 3 + 2]) > spread / 2) velocities[i].z *= -1;

            // Check distances for connections
            for (let j = i + 1; j < particleCount; j++) {
                const dx = posArray[i * 3] - posArray[j * 3];
                const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
                const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
                const distSq = dx*dx + dy*dy + dz*dz;

                if (distSq < 1500) { // Connection radius squared
                    linePositions.push(
                        posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2],
                        posArray[j * 3], posArray[j * 3 + 1], posArray[j * 3 + 2]
                    );
                }
            }
        }

        posAttribute.needsUpdate = true;
        
        // Update line geometry
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

        renderer.render(scene, camera);
    }
    
    animate();
}

// ------------------------------------------------------------------
// Graphic Scene Implementation (Centerpiece)
// ------------------------------------------------------------------
function initGraphicScene(canvas) {
    const container = canvas.parentElement;
    
    const scene = new THREE.Scene();
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    
    let width = container.clientWidth;
    let height = container.clientHeight;
    renderer.setSize(width, height);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Move camera back enough to see the object
    camera.position.z = 15;

    // Create the geometry (Icosahedron looks technical and modern)
    const geometry = new THREE.IcosahedronGeometry(4, 1);
    
    // We'll create a group to hold both solid and wireframe meshes
    const group = new THREE.Group();
    scene.add(group);

    // Get theme colors from body
    const isLightMode = document.body.classList.contains('light-mode');
    // We use the Swiss Red for the solid mesh to match the red arch
    const accentColor = 0xe62020; 

    // 1. Solid Material with standard shading
    const solidMaterial = new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.2,
        metalness: 0.1,
        flatShading: true,
        transparent: true,
        opacity: 0.85
    });
    const solidMesh = new THREE.Mesh(geometry, solidMaterial);
    
    // 2. Wireframe Material to give it that structural/blueprint look
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: isLightMode ? 0x000000 : 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    // slightly scale up wireframe to prevent z-fighting
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    wireframeMesh.scale.setScalar(1.02); 

    group.add(solidMesh);
    group.add(wireframeMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
    pointLight2.position.set(-10, -10, 5);
    scene.add(pointLight2);

    // Interaction vars
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;
    
    // Listen for mouse movement over the whole window for parallax effect
    document.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates roughly
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        targetRotationY = mouseX * 0.5;
        targetRotationX = -mouseY * 0.5;
    });

    // Resize handler tied to parent container
    window.addEventListener('resize', () => {
        if (!container) return;
        width = container.clientWidth;
        height = container.clientHeight;
        
        if (width === 0 || height === 0) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    // Listen for theme toggle to update wireframe color
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const isLight = document.body.classList.contains('light-mode');
                wireframeMaterial.color.setHex(isLight ? 0x000000 : 0xffffff);
            }
        });
    });
    observer.observe(document.body, { attributes: true });


    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Constant gentle rotation
        group.rotation.x += 0.002;
        group.rotation.y += 0.003;

        // Interactive "parallax" rotation on top of constant rotation
        // We gently interpolate the group's rotation towards the target interaction rotation
        // To avoid resetting the constant rotation, we could use a pivot group, but simple interpolation works for subtle effect
        group.rotation.x += (targetRotationX - group.rotation.x) * 0.02;
        group.rotation.y += (targetRotationY - group.rotation.y) * 0.02;
        
        // Add a gentle floating effect (sine wave on Y axis)
        group.position.y = Math.sin(Date.now() * 0.001) * 0.5;

        renderer.render(scene, camera);
    }
    
    // Slight delay to ensure layout is finalized before first render sized
    setTimeout(() => {
        width = container.clientWidth;
        height = container.clientHeight;
        if(width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
        animate();
    }, 100);
}
