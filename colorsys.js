const colorsys = {};
(function () {
    colorsys.hsvToRgb = (h, s, v) => {
        if (s == 0) {
            return { r: v, g: v, b: v };
        }

        h = (h + 360) % 360;
        const ff = h % 60;
        const p = Math.floor(v * (255 - s) / 255);
        const q = Math.floor(v * (255 - s * ff / 60) / 255);
        const t = Math.floor(v * (255 - s * (60 - ff) / 60) / 255);


        switch (Math.floor(h / 60)) { // [0, 5] - sector for this color
            case 0: return { r: v, g: t, b: p };
            case 1: return { r: q, g: v, b: p };
            case 2: return { r: p, g: v, b: t };
            case 3: return { r: p, g: q, b: v };
            case 4: return { r: t, g: p, b: v };
            case 5: return { r: v, g: p, b: q };
        }

    }
    colorsys.hsv2Rgb = colorsys.hsvToRgb;

    function byteToHex(b) {
        if (b < 16) return '0' + b.toString(16);
        return b.toString(16);
    }

    colorsys.rgbToHexString = (r, g, b) => {
        return '#' + byteToHex(r) + byteToHex(g) + byteToHex(b);
    }

    colorsys.stringToRgb = (s) => {
        return {
            r: Number.parseInt(s.substring(1,3), 16),
            g: Number.parseInt(s.substring(3,5), 16),
            b: Number.parseInt(s.substring(5,7), 16),
        }
    }

    class DrawImage {
        width;
        height;
        buffer;
        buffPos;

        constructor(width, height) {
            this.width = width;
            this.height = height
            this.buffer = new Uint8ClampedArray(width * height * 4);
            this.buffPos = 0;

        }

        addNextPointHsv(hue, saturation, luma) {
            const rgb = colorsys.hsv2Rgb(hue, saturation, luma);
            if (!rgb) debugger;
            this.buffer[this.buffPos++] = rgb.r;
            this.buffer[this.buffPos++] = rgb.g;
            this.buffer[this.buffPos++] = rgb.b;
            this.buffer[this.buffPos++] = 255;
        }

        getUrl() {
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            const ctx = canvas.getContext('2d');
            const idata = ctx.createImageData(this.width, this.height);
            idata.data.set(this.buffer);
            ctx.putImageData(idata, 0, 0);
            this.imageUrl = canvas.toDataURL();
            return this.imageUrl;
        }
    }

    colorsys.DrawImage = DrawImage;
})()