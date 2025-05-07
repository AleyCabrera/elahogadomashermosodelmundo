// Configuración global
const CONFIG = {
    headerScrollOffset: 50,
    animationOffset: window.innerHeight / 1.2,
    audioVolumes: {
        waves: 0.3,
        village: 0.4
    },
    videoCheckInterval: 1000
};

// Optimización de selectores
const DOM = {
    header: document.querySelector('header'),
    menuToggle: document.querySelector('.menu-toggle'),
    nav: document.querySelector('nav'),
    soundToggle: document.getElementById('soundToggle'),
    wavesSound: document.getElementById('wavesSound'),
    villageSound: document.getElementById('villageSound'),
    videoWrapper: document.querySelector('.video-wrapper'),
    videoOverlay: document.querySelector('.video-overlay'),
    videoIframe: document.getElementById('storyVideo'),
    fullscreenBtn: document.getElementById('fullscreenBtn')
};

// Helpers
const utils = {
    throttle: (func, limit) => {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },

    isElementInViewport: (el, offset = 0) => {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) - offset
        );
    }
};

// Header scroll effect
const handleHeaderScroll = utils.throttle(() => {
    DOM.header.classList.toggle('scrolled', window.scrollY > CONFIG.headerScrollOffset);
}, 100);

// Mobile menu toggle
const toggleMobileMenu = () => {
    DOM.nav.classList.toggle('active');
    const icon = DOM.menuToggle.querySelector('i');
    icon.classList.toggle('fa-times');
    icon.classList.toggle('fa-bars');
};

// Smooth scrolling for anchor links
const initSmoothScrolling = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (DOM.nav.classList.contains('active')) {
                    toggleMobileMenu();
                }
            }
        });
    });
};

// Animation manager
const animationManager = {
    elements: document.querySelectorAll('.story, .analysis-card, .author-content, .post-card'),
    
    init: () => {
        animationManager.elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });
        animationManager.checkVisibility();
    },
    
    checkVisibility: utils.throttle(() => {
        animationManager.elements.forEach((el, index) => {
            if (utils.isElementInViewport(el, 100)) {
                el.style.transitionDelay = `${index * 0.1}s`;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    }, 100)
};

// Audio Manager
const audioManager = (() => {
    let soundsEnabled = false;
    let observers = [];
    
    const init = () => {
        // Configuración inicial de audio
        DOM.wavesSound.volume = CONFIG.audioVolumes.waves;
        DOM.villageSound.volume = CONFIG.audioVolumes.village;
        
        // Event listeners
        DOM.soundToggle.addEventListener('click', toggleSounds);
        
        // Observers para activar sonidos
        setupObservers();
    };
    
    const setupObservers = () => {
        // Sonido de olas en hero section
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (soundsEnabled && entry.isIntersecting) {
                    safePlay(DOM.wavesSound);
                } else {
                    DOM.wavesSound.pause();
                }
            });
        }, { threshold: 0.5 });
        
        heroObserver.observe(document.querySelector('.hero'));
        observers.push(heroObserver);
        
        // Sonido de pueblo en story section
        const storyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (soundsEnabled && entry.isIntersecting) {
                    DOM.villageSound.currentTime = 0;
                    safePlay(DOM.villageSound);
                } else {
                    DOM.villageSound.pause();
                }
            });
        }, { threshold: 0.3 });
        
        storyObserver.observe(document.querySelector('.story-section'));
        observers.push(storyObserver);
    };
    
    const toggleSounds = () => {
        soundsEnabled = !soundsEnabled;
        
        if (soundsEnabled) {
            DOM.soundToggle.classList.add('audio-active');
            DOM.soundToggle.innerHTML = '<i class="fas fa-volume-up"></i><div class="audio-wave"></div>';
            safePlay(DOM.wavesSound);
        } else {
            DOM.soundToggle.classList.remove('audio-active');
            DOM.soundToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
            DOM.wavesSound.pause();
            DOM.villageSound.pause();
        }
    };
    
    const safePlay = (audioElement) => {
        audioElement.play().catch(e => {
            console.warn("Audio playback prevented:", e);
            // Mostrar UI para que el usuario active el audio
            DOM.soundToggle.classList.add('error');
            DOM.soundToggle.title = "Click para permitir audio";
        });
    };
    
    return { init };
})();

document.addEventListener('DOMContentLoaded', function() {
    // Efecto 3D con movimiento de mouse
    const waves3dContainer = document.querySelector('.waves-3d-container');
    const waves3dGroup = document.querySelector('.waves-3d-group');
    
    if (waves3dContainer && waves3dGroup) {
        waves3dContainer.addEventListener('mousemove', (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            waves3dGroup.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });
        
        waves3dContainer.addEventListener('mouseleave', () => {
            waves3dGroup.style.transform = 'rotateY(0) rotateX(0)';
        });
    }
});

// Video Player Controller
const videoController = (() => {
    let videoEndChecker;
    
    const init = () => {
        if (!DOM.videoIframe) return;
        
        DOM.videoOverlay.addEventListener('click', handleVideoPlay);
        DOM.fullscreenBtn.addEventListener('click', handleFullscreen);
        
        // Chequear fin del video
        videoEndChecker = setInterval(() => {
            if (DOM.videoIframe.contentWindow) {
                DOM.videoIframe.contentWindow.postMessage(
                    '{"event":"command","func":"getPlayerState"}', 
                    '*'
                );
            }
        }, CONFIG.videoCheckInterval);
        
        window.addEventListener('message', handleVideoMessages);
    };
    
    const handleVideoPlay = () => {
        DOM.videoOverlay.style.opacity = '0';
        DOM.videoOverlay.style.pointerEvents = 'none';
        
        const iframeSrc = DOM.videoIframe.src;
        if (!iframeSrc.includes('autoplay=1')) {
            DOM.videoIframe.src = iframeSrc.includes('?') ? 
                `${iframeSrc}&autoplay=1` : 
                `${iframeSrc}?autoplay=1`;
        }
    };
    
    const handleFullscreen = () => {
        if (DOM.videoWrapper.requestFullscreen) {
            DOM.videoWrapper.requestFullscreen();
        } else if (DOM.videoWrapper.webkitRequestFullscreen) {
            DOM.videoWrapper.webkitRequestFullscreen();
        } else if (DOM.videoWrapper.msRequestFullscreen) {
            DOM.videoWrapper.msRequestFullscreen();
        }
    };
    
    const handleVideoMessages = (e) => {
        if (e.data === 'ended') {
            DOM.videoOverlay.style.opacity = '1';
            DOM.videoOverlay.style.pointerEvents = 'auto';
        }
    };
    
    const cleanup = () => {
        clearInterval(videoEndChecker);
        window.removeEventListener('message', handleVideoMessages);
    };
    
    return { init, cleanup };
})();

// Inicialización general
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('scroll', handleHeaderScroll);
    window.addEventListener('scroll', animationManager.checkVisibility);
    DOM.menuToggle.addEventListener('click', toggleMobileMenu);
    
    initSmoothScrolling();
    animationManager.init();
    audioManager.init();
    videoController.init();
});

// Limpieza al salir de la página (para SPA)
window.addEventListener('beforeunload', () => {
    videoController.cleanup();
});

// JavaScript para olas en Canvas
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let waves = [];
const waveCount = 3;

function init() {
  resizeCanvas();
  createWaves();
  animate();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight * 0.15;
}

function createWaves() {
  for (let i = 0; i < waveCount; i++) {
    waves.push({
      y: height - (i * 20),
      amplitude: 15 + (i * 10),
      wavelength: 0.01 + (i * 0.005),
      speed: 0.02 + (i * 0.01),
      points: [],
      color: `rgba(32, 87, 129, ${0.3 + (i * 0.2)})`
    });
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  
  waves.forEach((wave, index) => {
    wave.points = [];
    
    for (let x = 0; x <= width; x += 20) {
      const y = wave.y + Math.sin(x * wave.wavelength + Date.now() * wave.speed) * wave.amplitude;
      wave.points.push({ x, y });
    }
    
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    wave.points.forEach(point => {
      ctx.lineTo(point.x, point.y);
    });
    
    ctx.lineTo(width, height);
    ctx.closePath();
    
    // Gradiente para efecto más realista
    const waveGradient = ctx.createLinearGradient(0, wave.y - wave.amplitude, 0, wave.y + wave.amplitude);
    waveGradient.addColorStop(0, `rgba(32, 87, 129, ${0.1 + index * 0.1})`);
    waveGradient.addColorStop(0.5, wave.color);
    waveGradient.addColorStop(1, `rgba(79, 149, 157, ${0.2 + index * 0.1})`);
    
    ctx.fillStyle = waveGradient;
    ctx.fill();
  });
  
  requestAnimationFrame(animate);
}

init();