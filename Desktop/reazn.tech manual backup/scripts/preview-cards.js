// Preview cards in the projects section

// Debug flag - set to true to show console logs
const DEBUG = false;

// Basic variables
let mouseX = 0;
let mouseY = 0;
let activeProject = null;
let isTracking = false;

// Physics variables for smooth following
let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;
let velocity = { x: 0, y: 0 };
const springStrength = 0.05; // Reduced for more delay
const dampening = 0.8; // Increased for more smoothing
const verticalOffset = 200; // Increased vertical offset to 200px

// Get DOM elements
const preview = document.querySelector('.preview-window');
const previewImg = document.getElementById('preview-image');

// Function to log debug messages
function log(message) {
    if (DEBUG) console.log(`[Preview] ${message}`);
}

// Create a new standalone preview element
function createStandalonePreview() {
    // Remove any existing preview first
    const existingPreview = document.getElementById('standalone-preview');
    if (existingPreview) existingPreview.remove();
    
    // Create new preview container
    const container = document.createElement('div');
    container.id = 'standalone-preview';
    container.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        top: 0;
        left: 0;
        transform-origin: center center;
        transition: opacity 0.2s ease;
        opacity: 0;
        display: none;
    `;
    
    // Create image element
    const img = document.createElement('img');
    img.style.cssText = `
        max-width: 250px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // Add to DOM
    container.appendChild(img);
    document.body.appendChild(container);
    
    log('Created standalone preview element');
    return { container, img };
}

// Function to update physics
function updatePhysics() {
    // Calculate spring force
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    
    // Apply spring physics
    velocity.x += dx * springStrength;
    velocity.y += dy * springStrength;
    
    // Apply dampening
    velocity.x *= dampening;
    velocity.y *= dampening;
    
    // Update position
    currentX += velocity.x;
    currentY += velocity.y;
    
    return {
        x: currentX,
        y: currentY
    };
}

// Function to update preview position with physics
function updatePreviewPosition(element) {
    if (!isTracking) return;
    
    targetX = mouseX;
    targetY = mouseY + verticalOffset;
    
    const physics = updatePhysics();
    
    element.style.transform = `translate(-50%, -50%)`;
    element.style.left = `${physics.x}px`;
    element.style.top = `${physics.y}px`;
    
    requestAnimationFrame(() => updatePreviewPosition(element));
}

// Initialize the preview system
function initPreviewSystem() {
    log('Initializing preview system');
    
    // Create our custom preview element
    const { container: previewEl, img: imgEl } = createStandalonePreview();
    
    // Track mouse movement globally
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // If we're actively tracking, update the preview position immediately
        if (isTracking) {
            updatePreviewPosition(previewEl);
            
            // Check if mouse is near any project links
            if (activeProject) {
                const isNearLinks = checkIfNearLinks(activeProject, mouseX, mouseY);
                if (isNearLinks) {
                    previewEl.style.opacity = '0';
                } else {
                    previewEl.style.opacity = '1';
                }
            }
        }
    });
    
    // Handle project hover
    const projects = document.querySelectorAll('.project');
    projects.forEach(project => {
        // Mouse enter a project
        project.addEventListener('mouseenter', (e) => {
            activateProjectPreview(project, previewEl, imgEl);
        });
        
        // Mouse leave a project
        project.addEventListener('mouseleave', () => {
            log('Left project');
            previewEl.style.opacity = '0';
            setTimeout(() => {
                if (!isTracking) previewEl.style.display = 'none';
            }, 200);
            isTracking = false;
            activeProject = null;
        });
    });
    
    // Setup intersection observer to handle scrolling into projects
    setupIntersectionObserver(previewEl, imgEl);
}

// Helper function to activate preview for a project
function activateProjectPreview(project, previewEl, imgEl) {
    const previewImg = project.getAttribute('data-preview');
    if (!previewImg) return;
    
    log(`Activating project: ${project.querySelector('h3')?.textContent}`);
    activeProject = project;
    imgEl.src = previewImg;
    imgEl.onload = () => {
        previewEl.style.opacity = '1';
        previewEl.style.display = 'block';
        isTracking = true;
        
        // Initialize physics position to current mouse position with vertical offset
        currentX = mouseX;
        currentY = mouseY + verticalOffset;
        targetX = mouseX;
        targetY = mouseY + verticalOffset;
        velocity = { x: 0, y: 0 };
        
        // Start the animation loop
        updatePreviewPosition(previewEl);
        
        // Check if near links
        const isNearLinks = checkIfNearLinks(project, mouseX, mouseY);
        if (isNearLinks) {
            previewEl.style.opacity = '0';
        }
    };
}

// Set up intersection observer to detect when projects enter viewport
function setupIntersectionObserver(previewEl, imgEl) {
    // Create the observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // If a project is entering the viewport
            if (entry.isIntersecting) {
                const project = entry.target;
                
                // Check if the mouse cursor is over this project
                const rect = project.getBoundingClientRect();
                if (
                    mouseX >= rect.left &&
                    mouseX <= rect.right &&
                    mouseY >= rect.top &&
                    mouseY <= rect.bottom
                ) {
                    log('Project scrolled into cursor position');
                    
                    // If we're not already tracking another project
                    if (!isTracking) {
                        activateProjectPreview(project, previewEl, imgEl);
                    }
                }
            }
        });
    }, {
        // Only trigger when at least 30% of the project is visible
        threshold: 0.3
    });
    
    // Observe all project elements
    document.querySelectorAll('.project').forEach(project => {
        observer.observe(project);
    });
}

// Function to check if cursor is near project links
function checkIfNearLinks(projectElement, x, y) {
    // Find all link elements within the project-links container
    const linksContainer = projectElement.querySelector('.project-links');
    if (!linksContainer) return false;
    
    // Get bounding rect of the links container
    const rect = linksContainer.getBoundingClientRect();
    
    // Define a larger detection area around the links (100px buffer)
    const buffer = 100;
    const extendedRect = {
        left: rect.left - buffer,
        right: rect.right + buffer,
        top: rect.top - buffer,
        bottom: rect.bottom + buffer
    };
    
    // Check if cursor is within the extended area
    const isNear = 
        x >= extendedRect.left && 
        x <= extendedRect.right && 
        y >= extendedRect.top && 
        y <= extendedRect.bottom;
    
    if (isNear && isTracking) {
        log('Cursor near links - hiding preview');
    }
    
    return isNear;
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreviewSystem);
} else {
    initPreviewSystem();
} 
