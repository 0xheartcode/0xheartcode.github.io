document.addEventListener('DOMContentLoaded', () => {
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'b' || e.key === 'B') {
            // Go back to projects page when B is pressed
            window.location.href = '../index.html#projects';
        }
    });
    
    // Add animation to feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
        // Add a small delay for each item
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
        // Create pixel art placeholder (you can replace this with actual screenshots)
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        
        // Draw pixel art pattern
        const pixelSize = 8;
        for (let y = 0; y < canvas.height; y += pixelSize) {
            for (let x = 0; x < canvas.width; x += pixelSize) {
                // Random pixel colors that fit your theme
                const colors = ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AAAA00', '#AAAAAA'];
                const randomColorIndex = Math.floor(Math.random() * colors.length);
                ctx.fillStyle = Math.random() > 0.7 ? colors[randomColorIndex] : '#FFFFFF';
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }
        
        box.innerHTML = '';
        box.appendChild(canvas);
    });
});
