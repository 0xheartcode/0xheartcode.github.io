document.addEventListener('DOMContentLoaded', () => {
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'ArrowLeft') {
            window.location.href = '../index.html#projects';
        } else if (e.key === 'ArrowDown') {
            window.scrollBy({ top: 240, behavior: 'smooth' });
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            window.scrollBy({ top: -240, behavior: 'smooth' });
            e.preventDefault();
        }
    });
    
    function hashString(str) {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      return hash >>> 0;
    }
    
    function generateEnhancedIdenticonSVG(seed, size = 64) {
      const hash = hashString(seed);
      
      const mainColor = '#' + ((hash & 0xFFFFFF) >>> 0).toString(16).padStart(6, '0');
      const bgColor = '#' + ((~hash & 0xFFFFFF) >>> 0).toString(16).padStart(6, '0');
      
      const blocks = 8; 
      const blockSize = size / blocks;
      
      const bits = hash.toString(2).padStart(32, '0') + 
                  (hash ^ 0xFFFFFFFF).toString(2).padStart(32, '0');
      
      // Create SVG with background
      let svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">`;

      svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="${bgColor}" />`;
      
      for (let y = 0; y < blocks; y++) {
        for (let x = 0; x < Math.ceil(blocks / 2); x++) {
          const i = (y * blocks + x) % bits.length;
          const i2 = (y * blocks + x + 7) % bits.length; 
          
          if (bits[i] === '1' || (bits[i2] === '1' && y % 2 === 0)) {
            const px = x * blockSize;
            const py = y * blockSize;
            
            const opacity = 0.7 + ((hash >> (y * 3)) & 0x3) / 10;
            
            svg += `<rect x="${px}" y="${py}" width="${blockSize}" height="${blockSize}" fill="${mainColor}" fill-opacity="${opacity}" />`;
            
            svg += `<rect x="${(blocks - 1 - x) * blockSize}" y="${py}" width="${blockSize}" height="${blockSize}" fill="${mainColor}" fill-opacity="${opacity}" />`;
          }
        }
      }
      
      svg += `</svg>`;
      return svg;
    }
    
    const badgeIcon = document.querySelector('.badge-icon');
    if (badgeIcon) {
      // Get both the project name and the category to create a more unique identifier
      const projectName = document.querySelector('h1').textContent.trim();
      
      // Combine them for a more unique seed
      const seed = projectName;
      
      // Generate enhanced SVG that fills the space
      const svg = generateEnhancedIdenticonSVG(seed, 60); // Increased size to fill space better
      
      // Replace the badge icon content with the SVG
      badgeIcon.innerHTML = svg;
      
      // Add styling to ensure it fills the space properly
      badgeIcon.style.display = 'flex';
      badgeIcon.style.justifyContent = 'center';
      badgeIcon.style.alignItems = 'center';
      badgeIcon.style.padding = '0';
      badgeIcon.style.overflow = 'hidden';
    }
    
    // Add animation to feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            item.style.transition = 'opacity 0.3s, transform 0.3s';
            
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 100);
        }, index * 200);
    });
    
    // Optional: Add placeholder for screenshots
    document.querySelectorAll('.pixel-box').forEach(box => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        
        const pixelSize = 8;
        for (let y = 0; y < canvas.height; y += pixelSize) {
            for (let x = 0; x < canvas.width; x += pixelSize) {
                const colors = ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AAAA00', '#AAAAAA'];
                const randomColorIndex = Math.floor(Math.random() * colors.length);
                ctx.fillStyle = Math.random() > 0.7 ? colors[randomColorIndex] : '#FFFFFF';
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }
        
        box.innerHTML = '';
        box.appendChild(canvas);
    });

    // SIMPLE/FULL for project detail pages: wrap the "extra" sections (archived pages are not
    // pre-wrapped), then show a floating toggle that shares the view-mode preference with the site.
    (function () {
        // Wrap sections if the page has no .detail-extra container yet
        if (!document.querySelector('.detail-extra')) {
            let content = null;
            document.querySelectorAll('.pixel-border').forEach(b => {
                if (b.querySelector('h2') && /PROJECT OVERVIEW/i.test(b.textContent)) content = b;
            });
            if (content) {
                let section = null;
                Array.from(content.children).forEach(el => {
                    if (el.tagName === 'H2') section = el.textContent.trim().toUpperCase();
                    const keep = section === 'PROJECT OVERVIEW' || section === 'LINKS';
                    if (section === 'PROJECT OVERVIEW' && el.tagName === 'P') el.classList.add('detail-overview');
                    if (section && !keep) el.classList.add('detail-extra');
                });
            }
        }
        if (!document.querySelector('.detail-extra')) return; // nothing to toggle

        const isSimple = () => document.body.classList.contains('detail-simple');
        function setDetailSimple(simple) {
            document.body.classList.toggle('detail-simple', simple);
            const b = document.getElementById('view-fab-btn');
            if (b) b.textContent = simple ? '▦ SIMPLE' : '▦ FULL';
            try { localStorage.setItem('view-mode', simple ? 'simple' : 'full'); } catch (e) {}
        }

        // Floating toggle (bottom-right); no arrow hint on detail pages
        const fab = document.createElement('div');
        fab.id = 'view-fab';
        fab.innerHTML = '<div class="vf-hint">◂ ▴ ▾ ▸ navigate</div><button class="vf-toggle" id="view-fab-btn">▦ FULL</button>';
        document.body.appendChild(fab);
        document.getElementById('view-fab-btn').addEventListener('click', () => setDetailSimple(!isSimple()));
        document.addEventListener('keydown', (e) => {
            if (e.key === 's' || e.key === 'S') setDetailSimple(!isSimple());
        });

        // Apply the saved preference on load
        let saved = false;
        try { saved = localStorage.getItem('view-mode') === 'simple'; } catch (e) {}
        document.body.classList.toggle('detail-simple', saved);
        const b0 = document.getElementById('view-fab-btn');
        if (b0) b0.textContent = saved ? '▦ SIMPLE' : '▦ FULL';
    })();
});
