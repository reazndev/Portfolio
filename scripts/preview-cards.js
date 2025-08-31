


const DEBUG = false;


let mouseX = 0;
let mouseY = 0;
let activeProject = null;
let isTracking = false;


let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;
let velocity = { x: 0, y: 0 };
const springStrength = 0.05; 
const dampening = 0.8; 
const verticalOffset = 200; 


const preview = document.querySelector('.preview-window');
const previewImg = document.getElementById('preview-image');


function log(message) {
    if (DEBUG) console.log(`[Preview] ${message}`);
}


function createStandalonePreview() {
    
    const existingPreview = document.getElementById('standalone-preview');
    if (existingPreview) existingPreview.remove();
    
    
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
    
    
    const img = document.createElement('img');
    img.style.cssText = `
        max-width: 250px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    
    container.appendChild(img);
    document.body.appendChild(container);
    
    log('Created standalone preview element');
    return { container, img };
}


function updatePhysics() {
    
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    
    
    velocity.x += dx * springStrength;
    velocity.y += dy * springStrength;
    
    
    velocity.x *= dampening;
    velocity.y *= dampening;
    
    
    currentX += velocity.x;
    currentY += velocity.y;
    
    return {
        x: currentX,
        y: currentY
    };
}


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


function initPreviewSystem() {
    log('Initializing preview system');
    
    
    const { container: previewEl, img: imgEl } = createStandalonePreview();
    
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        
        if (isTracking) {
            updatePreviewPosition(previewEl);
            
            
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
    
    
    const projects = document.querySelectorAll('.project');
    projects.forEach(project => {
        
        project.addEventListener('mouseenter', (e) => {
            activateProjectPreview(project, previewEl, imgEl);
        });
        
        
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
    
    
    setupIntersectionObserver(previewEl, imgEl);
}


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
        
        
        currentX = mouseX;
        currentY = mouseY + verticalOffset;
        targetX = mouseX;
        targetY = mouseY + verticalOffset;
        velocity = { x: 0, y: 0 };
        
        
        updatePreviewPosition(previewEl);
        
        
        const isNearLinks = checkIfNearLinks(project, mouseX, mouseY);
        if (isNearLinks) {
            previewEl.style.opacity = '0';
        }
    };
}


function setupIntersectionObserver(previewEl, imgEl) {
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            
            if (entry.isIntersecting) {
                const project = entry.target;
                
                
                const rect = project.getBoundingClientRect();
                if (
                    mouseX >= rect.left &&
                    mouseX <= rect.right &&
                    mouseY >= rect.top &&
                    mouseY <= rect.bottom
                ) {
                    log('Project scrolled into cursor position');
                    
                    
                    if (!isTracking) {
                        activateProjectPreview(project, previewEl, imgEl);
                    }
                }
            }
        });
    }, {
        
        threshold: 0.3
    });
    
    
    document.querySelectorAll('.project').forEach(project => {
        observer.observe(project);
    });
}


function checkIfNearLinks(projectElement, x, y) {
    
    const linksContainer = projectElement.querySelector('.project-links');
    if (!linksContainer) return false;
    
    
    const rect = linksContainer.getBoundingClientRect();
    
    
    const buffer = 100;
    const extendedRect = {
        left: rect.left - buffer,
        right: rect.right + buffer,
        top: rect.top - buffer,
        bottom: rect.bottom + buffer
    };
    
    
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


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreviewSystem);
} else {
    initPreviewSystem();
} 
