//Shift + Alt + F - autoformat
const EPSILON = 1.0e-5;
// /https://learn.javascript.ru/bezier
//https://habr.com/ru/articles/264191/
function calculateSpline(points) {
    let n = points.length - 2;
    if (n < 1) return;

    const bezier = [];

    let next = normalizePoint({ x: points[1].x - points[0].x, y: points[1].y - points[0].y });
    let tgL = { x: 0, y: 0 };
    let tgR = { x: 0, y: 0 };
    let cur;

    for (let i = 0; i < n; i++) {
        const p = points[i];
        const p1 = points[i + 1];
        const p2 = points[i + 2];

        cur = next;
        next = normalizePoint({ x: p2.x - p1.x, y: p2.y - p1.y });


        tgL = tgR;
        tgR = normalizePoint({ x: cur.x + next.x, y: cur.y + next.y });

        let l1 = 0.0;
        let l2 = 0.0;


        let dx = (p1.x - p.x) / 2;

        if (dx > 50) dx = 50;
        l1 = tgL.x > 0 ? dx / tgL.x : 1.0;
        l2 = tgR.x > 0 ? dx / tgR.x : 1.0;


        if (tgL.x > 0 && tgR.x > 0) {
            const tmp = tgL.y / tgL.x - tgR.y / tgR.x;
            if (Math.abs(tmp) > EPSILON) {
                x = (p1.y - tgR.y / tgR.x * p1.x - p.y + tgL.y / tgL.x * p.x) / tmp;
                if (x > p.x && x < p1.x) {
                    if (tgL.y > 0.0) { if (l1 > l2) l1 = 0.0; else l2 = 0.0; }
                    else { if (l1 < l2) l1 = 0.0; else l2 = 0.0; }
                }
            }
        }
        bezier.push(p, { x: p.x + tgL.x * l1, y: p.y + tgL.y * l1 }, { x: p1.x - tgR.x * l2, y: p1.y - tgR.y * l2 });

    }
    const l = tgL.x > 0 ? (points[n + 1].x - points[n].x) / (2.0 * tgL.x) : 1.0;

    const p = points[n]
    bezier.push(p, { x: p.x + tgR.x * l, y: p.y + tgR.y * l }, points[n + 1], points[n + 1]);

    return bezier;
}

function normalizePoint(point) {
    const l = Math.sqrt(point.x * point.x + point.y * point.y);
    if (l < EPSILON) return { x: 0, y: 0 }
    const r = { x: point.x / l, y: point.y / l }
    if (Math.abs(r.x) < EPSILON) r.x = 0;
    if (Math.abs(r.y) < EPSILON) r.y = 0;
    return r;
}




const tabs = [

];

function registerTab(parentTabTitle, obj) {
    let tab = tabs.find(i => i.title === parentTabTitle);
    if (!tab) {
        tab = { title: parentTabTitle };
        tabs.push(tab);
    }

    if (!obj || !obj.tabTitle) return;
    if (!tab.tabs) tab.tabs = [];
    let subtab = tab.tabs.find(i => i.title === obj.tabTitle);
    if (!subtab) {
        subtab = { title: obj.tabTitle };
        tab.tabs.push(subtab);
    }
    subtab.obj = obj;
}

registerTab("Color Wheels", { tabTitle: "RgbHsv" });
registerTab("Color Wheels", { tabTitle: "Bars" });
registerTab("Curves");
registerTab("Parads");
registerTab("Color Bars");

$(() => {
    let selectedTab;
    const tabsPanel = $("#tabs-panel")
    const firstTabRow = $('<div class="tab-panel"></div>')
    tabsPanel.append(firstTabRow);
    tabs.forEach((item, index) => {

        const el = $(`<div class="tab-element">${item.title}</div>`);
        el.appendTo(firstTabRow);
        tabs[index].el = el;
        el.mousedown(() => selectTab(index));
        if (item.tabs) {
            const secondTabRow = $('<div class="tab-panel hide"></div>');
            tabsPanel.append(secondTabRow);
            item.tabs.forEach((i2, idx2) => {
                const el2 = $(`<div class="tab-element">${i2.title}</div>`);
                el2.appendTo(secondTabRow);
                el2.mousedown(() => selectTab(index, idx2));
                tabs[index].tabs[idx2].el = el2;
            })
        }
    });
    selectTab(1, 0);

    function selectTab(tab1, tab2) {
        if (selectedTab && selectedTab.obj && selectedTab.obj.deactivate) selectedTab.obj.deactivate();
        tabsPanel.find(".active").removeClass('active');
        tabs[tab1].el.addClass("active");
        selectedTab = tabs[tab1];
        tab2 = tab2 || 0;
        tabsPanel.find(".tab-panel").slice(1).addClass("hide");
        if (!tabs[tab1].tabs) return;
        const subTab = tabs[tab1].tabs[tab2];
        if (subTab) {
            subTab.el.addClass("active");
            subTab.el.parent().removeClass("hide");
            selectedTab = subTab;
            if (subTab.obj && subTab.obj.activate) {
                subTab.obj.activate();
            }
        };
    }




});



function bindAll(obj) {
    console.log("bind all")
    for (let prop in obj) {
        if (typeof obj[prop] === 'function') {
            console.log("prop", prop)
            obj[prop] = obj[prop].bind(obj);
        }
    }
}



const colorGrading = {
    valueX: 0,
    valueY: 0,
    rectCenterHeight: 5,
    EPSILON: 10e-5,
    createImage: function (width, height) {
        if (this.width === width && this.height === height && this.imageUrl) {
            return this.imageUrl
        }

        this.buffer = new Uint8ClampedArray(width * height * 4);
        this.buffPos = 0;
        this.width = width;
        this.height = height;

        console.log(this)
        this.creatingImage();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const idata = ctx.createImageData(width, height);
        idata.data.set(this.buffer);
        ctx.putImageData(idata, 0, 0);
        this.imageUrl = canvas.toDataURL();
        return this.imageUrl;
    },
    creatingImage: function () {

    },
    addNextPointHsv: function (hue, saturation, luma) {
        const rgb = colorsys.hsv2Rgb(hue, saturation, luma);
        this.buffer[this.buffPos++] = rgb.r;
        this.buffer[this.buffPos++] = rgb.g;
        this.buffer[this.buffPos++] = rgb.b;
        this.buffer[this.buffPos++] = 255;
    },
    activate: function () {
        const curveMargin = 6;
        const curveEl = $('#curves');
        this.curveEl = curveEl;
        curveEl.removeClass('hide')
        const parent = curveEl.parent();

        const curveHeight = Math.floor(parent.height()) - curveMargin * 2;
        const curveWidth = curveHeight * 3;
        curveEl.width(curveWidth + curveMargin * 2);
        curveEl.height(parent.height());

        curveEl.attr("viewBox", `-${curveMargin} -${curveMargin} ${curveEl.width()} ${curveEl.height()}`)
        const net = curveEl.find('[data-type="net"]');

        net.attr('height', curveHeight);
        net.attr('width', curveWidth);
        // circleShift = $('#p-template circle').attr('cx');
        // pointShift = netMargin - circleShift;
        const imageUrl = this.createImage(curveWidth, curveHeight);
        $(curveEl).find('[data-type="background"]').attr("href", imageUrl);
        Curve(curveEl[0], this.tabTitle, curveWidth, curveHeight)
    },
    deactivate: function () {
        this.curveEl.addClass('hide');
    }
}
const colorGradingHvH = {
    __proto__: colorGrading,

    title: "Hue vs. Hue",
    tabTitle: "HvH",
    valueY: 3600,
    neutralY: 3600 / 2,
    slidingScaleFactor: 2.7,

    posToValY: function (pos) {
        if (Math.abs(pos) < EPSILON) {
            return 0;
        }
        const d = Math.abs(this.neutralY - pos);
        if (pos >= this.valueY || d < EPSILON) {
            return pos;
        }


        const tmp = Math.pow(this.neutralY, 1 - this.slidingScaleFactor) * Math.pow(d, this.slidingScaleFactor);
        return pos < this.neutralY ? this.neutralY - tmp : this.neutralY + tmp;
    },

    valToDev: function (val) {
        return val / 10 - 180;
    },

    rotation: function (y) {
        const offset = 360 * (y - this.height / 2) / this.height * this.valueY / 2 / 180 + this.valueY / 2;
        return this.valToDev(this.posToValY(offset));
    },
    creatingImage: function () {
        const halfHeight = this.height / 2;

        for (let y = 0; y < this.height; ++y) {
            const distance = Math.abs(y - halfHeight);
            const center = distance <= this.rectCenterHeight;
            const luma = center ? 200 : 90 + 80 * distance / halfHeight;
            for (let x = 0; x < this.width; ++x) {
                const hue = (360 * x / this.width);
                const hue2 = hue + (center ? 0 : this.rotation(y));
                this.addNextPointHsv(hue2, 255, luma);
            }

        }
    }
}
registerTab("Curves", colorGradingHvH);

const colorGradingHvL = {
    __proto__: colorGrading,
    tabTitle: "HvL",
    title: "Hue vs. Luma",
    valueX: 0,
    valueY: 2048,
    valToDev: function (val) {
        return val * 4;
    },
    creatingImage: function () {
        const halfHeight = this.height / 2;
        for (let y = 0; y < this.height; ++y) {
            const distance = Math.abs(y - halfHeight);
            const center = distance <= this.rectCenterHeight;
            const saturation = center ? 255 : 127;
            const luma = center ? 192 : (this.height - y) * 255 / this.height;

            for (let x = 0; x < this.width; ++x) {
                const hue = (359 * x / this.width);
                this.addNextPointHsv(hue, saturation, luma);
            }
        }
    }
}

registerTab("Curves", colorGradingHvL);

const colorGradingHvS = {
    __proto__: colorGrading,
    tabTitle: "HvS",
    title: "Hue vs. Saturation",
    valueX: 0,
    valueY: 300,
    valToDev: function (val) {
        return (3 - val) * 100;
    },
    creatingImage: function () {
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                const hue = x * 359 / this.width;
                const saturation = (this.height - y) * 255 / this.height;
                this.addNextPointHsv(hue, saturation, saturation);
            }
        }
    }
}

registerTab("Curves", colorGradingHvS);


















