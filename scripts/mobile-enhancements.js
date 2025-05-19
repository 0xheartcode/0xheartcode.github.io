document.addEventListener('DOMContentLoaded', function() {
  // Function to check if device is mobile/touch
  function isMobileDevice() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
  }

  // Apply mobile-specific adjustments
  if (isMobileDevice()) {
    // Add mobile class to body for additional CSS targeting
    document.body.classList.add('mobile-device');
    
    // Add touch event support for menu items
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('touchstart', function() {
        this.classList.add('touch-active');
      });
      
      item.addEventListener('touchend', function() {
        this.classList.remove('touch-active');
        
        // Small delay to show the touch effect
        setTimeout(() => {
          // If this item has a target, navigate to it
          if (this.dataset.target) {
            // Use existing click behavior
          }
          
          // If this is a back button with onclick
          if (this.hasAttribute('onclick')) {
            // Use existing click behavior
          }
        }, 50);
      });
    });
    
    // Adjust terminal content for better readability on mobile
    document.querySelectorAll('.terminal').forEach(terminal => {
      // If content is too wide, add a horizontal scrolling cue
      if (terminal.scrollWidth > terminal.clientWidth) {
        terminal.classList.add('scrollable');
        
        // Add fading edges to indicate scrolling
        const fadeRight = document.createElement('div');
        fadeRight.className = 'terminal-fade-right';
        terminal.parentNode.insertBefore(fadeRight, terminal.nextSibling);
      }
    });
    
    // Optimize navigation for touch - make back function more accessible
    const addBackButton = () => {
      // Only add if we're not on the main screen and button doesn't exist yet
      if (window.location.hash && window.location.hash !== '#main' && !document.querySelector('.mobile-back-button')) {
        const backButton = document.createElement('div');
        backButton.className = 'mobile-back-button';
        backButton.innerHTML = '← BACK';
        backButton.addEventListener('click', () => {
          window.location.href = 'index.html#main';
        });
        document.body.appendChild(backButton);
      } else if (!window.location.hash || window.location.hash === '#main') {
        // Remove back button if we're on main
        const existingBtn = document.querySelector('.mobile-back-button');
        if (existingBtn) existingBtn.remove();
      }
    };
    
    // Call initially and when hash changes
    addBackButton();
    window.addEventListener('hashchange', addBackButton);
    
    // Add swipe detection for navigation
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    document.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, false);
    
    function handleSwipe() {
      const threshold = 100; // Minimum distance for swipe
      
      // Right swipe (go back)
      if (touchEndX - touchStartX > threshold) {
        // If not on main, go back
        if (window.location.hash && window.location.hash !== '#main') {
          window.location.href = 'index.html#main';
        }
      }
    }
  }
  
  // Handle project page responsiveness
  if (document.querySelector('.project-badge')) {
    // Adjust project badge sizing based on container
    const resizeBadge = () => {
      const badge = document.querySelector('.project-badge');
      const container = badge.closest('.pixel-border');
      if (container.offsetWidth < 300) {
        badge.style.width = '60px';
        badge.style.height = '60px';
      } else {
        badge.style.width = '';
        badge.style.height = '';
      }
    };
    
    // Call on load and resize
    resizeBadge();
    window.addEventListener('resize', resizeBadge);
  }
});
