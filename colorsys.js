const colorsys = {}
colorsys.hsvToRgb = (h, s, v) => {
    if (s == 0) {
        return { r: v, g: v, b: v };
    }

    h = (h + 360) % 360;
    const ff = h % 60;
    const p = Math.floor(v * (255 - s) / 255) ;
    const q = Math.floor(v * (255 - s * ff / 60) / 255);
    const t = Math.floor(v * (255 - s * (60 - ff) / 60) / 255) ;

    
    switch( Math.floor(h / 60)) { // [0, 5] - sector for this color
        case 0: return {r : v, g : t, b : p};
        case 1: return {r : q, g : v, b : p};
        case 2: return {r : p, g : v, b : t};
        case 3: return {r : p, g : q, b : v};
        case 4: return {r : t, g : p, b : v};
        case 5: return {r : v, g : p, b : q};
    }
    
}
colorsys.hsv2Rgb = colorsys.hsvToRgb;