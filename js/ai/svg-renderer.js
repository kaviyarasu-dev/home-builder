// js/ai/svg-renderer.js

function renderFloorPlanSVG(json) {
    if (!json || !json.floors || !json.floors.length) return '';
    
    const svgElements = [];
    const scale = 20; // 20 pixels per foot
    
    const pw = Number(json.plot_width) || 30;
    const pd = Number(json.plot_depth) || 40;
    const svgWidth = pw * scale + 100;
    const svgHeight = pd * scale + 100;
    
    // Create an SVG wrapper for each floor
    let html = '';
    
    json.floors.forEach(floor => {
        let svg = `<svg viewBox="-50 -50 ${svgWidth} ${svgHeight}" width="100%" height="auto" style="border: 1px solid #ddd; background: #fafafa; margin-bottom: 20px;">`;
        
        // Plot boundary
        svg += `<rect x="0" y="0" width="${pw * scale}" height="${pd * scale}" fill="none" stroke="#ccc" stroke-dasharray="4" />`;
        
        // Rooms
        if (Array.isArray(floor.rooms)) {
            floor.rooms.forEach(r => {
                const rx = Number(r.x) * scale;
                const ry = Number(r.y) * scale;
                const rw = Number(r.width) * scale;
                const rl = Number(r.length) * scale;
                const name = r.name || 'Room';
                
                // Room rect
                svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rl}" fill="#fff" stroke="#333" stroke-width="2" />`;
                
                // Label & Dimension
                const cx = rx + rw / 2;
                const cy = ry + rl / 2;
                svg += `<text x="${cx}" y="${cy - 5}" font-family="sans-serif" font-size="12" fill="#000" text-anchor="middle" dominant-baseline="middle">${name}</text>`;
                svg += `<text x="${cx}" y="${cy + 10}" font-family="sans-serif" font-size="10" fill="#666" text-anchor="middle" dominant-baseline="middle">${r.width}' x ${r.length}'</text>`;
                
                // Stair box with arrow
                if (name.toLowerCase().includes('stair')) {
                    // Draw lines across the stair box to indicate steps
                    const stepCount = Math.floor(Math.max(r.width, r.length) / 1.0); // Rough step representation
                    if (r.width > r.length) {
                       for(let i=1; i<stepCount; i++) {
                           const stepX = rx + i * (rw / stepCount);
                           svg += `<line x1="${stepX}" y1="${ry}" x2="${stepX}" y2="${ry + rl}" stroke="#aaa" stroke-width="1" />`;
                       }
                       // Arrow
                       svg += `<line x1="${rx + 10}" y1="${cy}" x2="${rx + rw - 10}" y2="${cy}" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)" />`;
                    } else {
                       for(let i=1; i<stepCount; i++) {
                           const stepY = ry + i * (rl / stepCount);
                           svg += `<line x1="${rx}" y1="${stepY}" x2="${rx + rw}" y2="${stepY}" stroke="#aaa" stroke-width="1" />`;
                       }
                       // Arrow
                       svg += `<line x1="${cx}" y1="${ry + 10}" x2="${cx}" y2="${ry + rl - 10}" stroke="#000" stroke-width="1.5" marker-end="url(#arrow)" />`;
                    }
                }
            });
        }
        
        // Openings
        if (Array.isArray(floor.openings)) {
            floor.openings.forEach(o => {
                const ox = Number(o.x) * scale;
                const oy = Number(o.y) * scale;
                // If it is just a line representation, enforce minimal thickness for visibility
                const ow = Math.max(Number(o.width) * scale, o.type === 'door' ? 4 : 4); 
                const ol = Math.max(Number(o.length) * scale, o.type === 'door' ? 4 : 4);
                
                if (o.type === 'door') {
                    // Door as a red rectangle
                    svg += `<rect x="${ox}" y="${oy}" width="${ow}" height="${ol}" fill="#fff" stroke="#d32f2f" stroke-width="2" />`;
                } else if (o.type === 'window') {
                    // Window as a blue rectangle
                    svg += `<rect x="${ox}" y="${oy}" width="${ow}" height="${ol}" fill="#bbdefb" stroke="#1976d2" stroke-width="2" />`;
                }
            });
        }
        
        // Dimension lines (Plot)
        svg += `<line x1="0" y1="-20" x2="${pw * scale}" y2="-20" stroke="#888" stroke-width="1" />`;
        svg += `<text x="${(pw * scale) / 2}" y="-25" font-family="sans-serif" font-size="12" fill="#888" text-anchor="middle">Width: ${pw}'</text>`;
        
        svg += `<line x1="-20" y1="0" x2="-20" y2="${pd * scale}" stroke="#888" stroke-width="1" />`;
        svg += `<text x="-25" y="${(pd * scale) / 2}" font-family="sans-serif" font-size="12" fill="#888" text-anchor="middle" transform="rotate(-90 -25 ${(pd * scale) / 2})">Depth: ${pd}'</text>`;

        svg += `<defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" />
            </marker>
        </defs>`;

        svg += `</svg>`;
        
        html += `<div class="floor-plan">
            <h4 style="margin: 10px 0;">${floor.floor_name || 'Floor ' + floor.floor_index}</h4>
            ${svg}
        </div>`;
    });
    
    return html;
}
